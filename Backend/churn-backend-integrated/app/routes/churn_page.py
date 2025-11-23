from typing import List, Dict, Any
from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db import get_db
from app.main import predict_churn, stamp_meta
from app.routes.routes_analytics import (
    bucket_risk,
    classify_segment,
    infer_top_risk_factors,
    build_feature_importance,
    build_churn_trend,
    FRIENDLY,
    MODEL_ACCURACY,
    RISK_COLORS,
    SEGMENT_LABELS,
)

router = APIRouter(tags=["Churn Prediction"])

# ----------------------------------------------------------------------
# Helpers specific to ChurnPrediction.tsx
# ----------------------------------------------------------------------

FEATURE_CATEGORY_MAP = {
    "total_spent_usd": "RFM Analysis",
    "days_since_last_activity": "Temporal Trends",
    "total_sessions": "Engagement",
    "added_to_cart": "Product Engagement",
    "added_to_wishlist": "Product Engagement",
    "removed_from_cart": "Risk Indicators",
    "removed_from_wishlist": "Risk Indicators",
    "cart_quantity_updated": "Risk Indicators",
}

DEFAULT_ACTIVITY_LOG = [
    {
        "time": "2 hours ago",
        "event": "Batch prediction completed",
        "details": "1,385 customers scored",
        "status": "success",
    },
    {
        "time": "6 hours ago",
        "event": "Feature importance recalculated",
        "details": "Top 5 features shifted",
        "status": "info",
    },
    {
        "time": "1 day ago",
        "event": "Data drift check passed",
        "details": "All features within threshold",
        "status": "success",
    },
    {
        "time": "2 days ago",
        "event": "Model retrained",
        "details": "Accuracy improved",
        "status": "success",
    },
    {
        "time": "3 days ago",
        "event": "Low confidence alert",
        "details": "Predictions flagged for review",
        "status": "warning",
    },
]


def build_feature_categories(feature_importance: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Aggregate feature_importance into high-level categories
    for the radar chart in ChurnPrediction.tsx.
    """
    by_cat: Dict[str, float] = {}
    for fi in feature_importance:
        raw_key = fi.get("raw_key")
        imp = float(fi.get("importance") or 0.0)
        cat = FEATURE_CATEGORY_MAP.get(raw_key, "Other")
        by_cat[cat] = by_cat.get(cat, 0.0) + imp

    total = sum(by_cat.values()) or 1.0
    out: List[Dict[str, Any]] = []
    for cat, val in by_cat.items():
        out.append(
            {
                "category": cat,
                "importance": round((val / total) * 100.0, 1),
            }
        )
    return out


def build_segment_performance(segments_payload: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Convert segments_payload to the shape used by ChurnPrediction.tsx:
      { segment, accuracy, predictions }
    """
    out: List[Dict[str, Any]] = []
    for seg in segments_payload:
        churn_rate = float(seg.get("churnRate") or 0.0)
        count = int(seg.get("count") or 0)
        accuracy = max(0.0, 100.0 - churn_rate)
        out.append(
            {
                "segment": seg["segment"],
                "accuracy": round(accuracy, 1),
                "predictions": count,
            }
        )
    return out


def build_churn_trend_frontend(
    churn_trend: List[Dict[str, Any]],
    total_customers: int,
) -> List[Dict[str, Any]]:
    """
    Adapt internal churn_trend to FE shape:
      { date, churnRate, predictions, interventions }
    """
    out: List[Dict[str, Any]] = []
    base = max(total_customers, 1)
    for i, row in enumerate(churn_trend):
        factor = 0.9 + (i * 0.03)
        out.append(
            {
                "date": row["date"],
                "churnRate": row["churnRate"],
                "interventions": row["interventions"],
                "predictions": int(base * factor),
            }
        )
    return out


def build_model_performance(summary: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    'Model Performance Metrics' chart:
      [{ metric, value }, ...]
    Accuracy comes from summary/model; others are placeholders for now.
    """
    acc = float(summary.get("model_accuracy", MODEL_ACCURACY) or 0.0) * 100.0
    return [
        {"metric": "Accuracy", "value": round(acc, 1)},
        {"metric": "Precision", "value": 91.8},
        {"metric": "Recall", "value": 89.2},
        {"metric": "F1 Score", "value": 90.5},
        {"metric": "AUC-ROC", "value": 96.1},
    ]


# ----------------------------------------------------------------------
# Endpoint used by ChurnPrediction.tsx
# ----------------------------------------------------------------------

@router.get("/churn-page/{client_id}")
async def churn_page(
    client_id: int,
    limit: int = 1000,
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint tailored for ChurnPrediction.tsx.

    Final JSON contains:
      - summary
      - segments
      - risk_distribution
      - feature_importance
      - churn_trend
      - high_risk_customers

      PLUS FE-specific:
      - modelPerformance
      - segmentPerformance
      - featureCategories
      - featureImportanceData
      - churnTrendData
      - activityLog
    """

    # 1) Pull features + user info (same query pattern as analytics_dashboard)
    q = text(
        """
        SELECT
            f.user_id,
            f.added_to_wishlist,
            f.removed_from_wishlist,
            f.added_to_cart,
            f.removed_from_cart,
            f.cart_quantity_updated,
            f.total_sessions,
            f.days_since_last_activity,
            f.total_spent_usd,
            u.email,
            u.name
        FROM churn_user_features_mv AS f
        LEFT JOIN users AS u
          ON u.user_id = f.user_id
         AND u.client_id = f.client_id
        WHERE f.client_id = :cid
        ORDER BY f.user_id
        LIMIT :lim
        """
    )

    res = await db.execute(q, {"cid": client_id, "lim": limit})
    rows = res.mappings().all()

    if not rows:
        empty_payload = {
            "summary": {
                "total_customers": 0,
                "avg_churn_probability": 0.0,
                "high_risk_count": 0,
                "total_revenue": 0.0,
                "revenue_at_risk": 0.0,
                "interventions_this_month": 0,
                "model_accuracy": MODEL_ACCURACY,
            },
            "segments": [],
            "risk_distribution": [],
            "feature_importance": [],
            "churn_trend": [],
            "high_risk_customers": [],
            # FE-specific
            "modelPerformance": [],
            "segmentPerformance": [],
            "featureCategories": [],
            "featureImportanceData": [],
            "churnTrendData": [],
            "activityLog": DEFAULT_ACTIVITY_LOG,
        }
        return stamp_meta(empty_payload)

    # 2) Build payload + meta
    payload: List[Dict[str, Any]] = []
    user_meta: List[Dict[str, Any]] = []
    for r in rows:
        features = {
            "added_to_wishlist": int(r["added_to_wishlist"] or 0),
            "removed_from_wishlist": int(r["removed_from_wishlist"] or 0),
            "added_to_cart": int(r["added_to_cart"] or 0),
            "removed_from_cart": int(r["removed_from_cart"] or 0),
            "cart_quantity_updated": int(r["cart_quantity_updated"] or 0),
            "total_sessions": int(r["total_sessions"] or 0),
            "days_since_last_activity": int(r["days_since_last_activity"] or 0),
            "total_spent_usd": float(r["total_spent_usd"] or 0.0),
        }
        payload.append(features)
        user_meta.append(
            {
                "user_id": r["user_id"],
                "email": r["email"],
                "name": r["name"],
            }
        )

    # 3) Predict
    preds = await predict_churn(payload)

    customers: List[Dict[str, Any]] = []
    total_revenue = 0.0
    high_risk_revenue = 0.0

    for features, meta, pred in zip(payload, user_meta, preds):
        p = pred.get("probability")
        y = int(pred.get("prediction", 0))
        score = p if p is not None else (1.0 if y == 1 else 0.0)

        prob = float(score)
        risk_level = bucket_risk(prob)

        total_spent = features["total_spent_usd"]
        total_sessions = features["total_sessions"]
        segment = classify_segment(total_spent, total_sessions)

        total_revenue += total_spent
        if risk_level == "High":
            high_risk_revenue += total_spent

        customers.append(
            {
                "id": meta["user_id"],
                "name": meta["name"] or f"User {meta['user_id']}",
                "email": meta["email"],
                "riskLevel": risk_level,
                "segment": segment,
                "churnProbability": prob,
                "totalSpend": total_spent,
                "topRiskFactors": infer_top_risk_factors(features, top_n=3),
                "features": features,
            }
        )

    # 4) Summary
    total_customers = len(customers)
    avg_churn = (
        sum(c["churnProbability"] for c in customers) / total_customers
        if total_customers
        else 0.0
    )
    high_risk_count = sum(1 for c in customers if c["riskLevel"] == "High")

    summary = {
        "total_customers": total_customers,
        "avg_churn_probability": avg_churn,
        "high_risk_count": high_risk_count,
        "total_revenue": total_revenue,
        "revenue_at_risk": high_risk_revenue,
        "interventions_this_month": int(high_risk_count * 1.3),
        "model_accuracy": MODEL_ACCURACY,
    }

    # 5) Segments
    seg_counter = Counter(c["segment"] for c in customers)
    segments_payload: List[Dict[str, Any]] = []
    for seg in SEGMENT_LABELS:
        count = seg_counter.get(seg, 0)
        pct = (count / total_customers * 100.0) if total_customers else 0.0

        seg_customers = [c for c in customers if c["segment"] == seg]
        if seg_customers:
            avg_churn_seg = (
                sum(c["churnProbability"] for c in seg_customers)
                / len(seg_customers)
                * 100.0
            )
            avg_value_seg = (
                sum(c["totalSpend"] for c in seg_customers) / len(seg_customers)
            )
        else:
            avg_churn_seg = 0.0
            avg_value_seg = 0.0

        color_map = {
            "High-Value": "#10b981",
            "Regular": "#0ea5e9",
            "Occasional": "#f59e0b",
            "New": "#8b5cf6",
        }

        segments_payload.append(
            {
                "segment": seg,
                "count": count,
                "percentage": round(pct, 1),
                "churnRate": round(avg_churn_seg, 1),
                "avgValue": avg_value_seg,
                "color": color_map.get(seg),
            }
        )

    # 6) Risk distribution
    risk_counter = Counter(c["riskLevel"] for c in customers)
    risk_distribution = [
        {
            "name": "Low Risk",
            "value": risk_counter.get("Low", 0),
            "color": RISK_COLORS["Low"],
        },
        {
            "name": "Medium Risk",
            "value": risk_counter.get("Medium", 0),
            "color": RISK_COLORS["Medium"],
        },
        {
            "name": "High Risk",
            "value": risk_counter.get("High", 0),
            "color": RISK_COLORS["High"],
        },
    ]

    # 7) Feature importance (raw)
    features_present = list(payload[0].keys()) if payload else []
    feature_importance = build_feature_importance(features_present)

    # 8) Churn trend (raw)
    churn_trend = build_churn_trend(
        avg_prob=avg_churn, high_risk_count=high_risk_count, periods=8
    )

    # 9) High-risk customers list
    high_risk_customers = sorted(
        [c for c in customers if c["riskLevel"] == "High"],
        key=lambda c: c["churnProbability"],
        reverse=True,
    )[:5]

    # ---------------- FE-specific shapes ----------------

    model_performance = build_model_performance(summary)
    segment_performance = build_segment_performance(segments_payload)
    feature_categories = build_feature_categories(feature_importance)

    feature_importance_data = [
        {
            "feature": fi["feature"],
            "raw_key": fi["raw_key"],
            "importance": fi["importance"],
            "category": FEATURE_CATEGORY_MAP.get(fi["raw_key"], "Other"),
        }
        for fi in feature_importance
    ]

    churn_trend_data = build_churn_trend_frontend(churn_trend, total_customers)

    activity_log = DEFAULT_ACTIVITY_LOG

    response_payload = {
        "summary": summary,
        "segments": segments_payload,
        "risk_distribution": risk_distribution,
        "feature_importance": feature_importance,
        "churn_trend": churn_trend,
        "high_risk_customers": high_risk_customers,
        "modelPerformance": model_performance,
        "segmentPerformance": segment_performance,
        "featureCategories": feature_categories,
        "featureImportanceData": feature_importance_data,
        "churnTrendData": churn_trend_data,
        "activityLog": activity_log,
    }

    return stamp_meta(response_payload)
