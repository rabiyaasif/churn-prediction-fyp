from typing import List, Dict, Any
from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db  # adjust import to your project
from app.main import predict_churn, stamp_meta  # adjust if these live elsewhere
from app.models import User  # if you need ORM joins later, currently we use raw SQL

router = APIRouter()

# If not already defined in this module, re-use your FRIENDLY / helpers
try:
    FRIENDLY  # type: ignore
except NameError:
    FRIENDLY = {
        "added_to_wishlist": "Added to Wishlist",
        "removed_from_wishlist": "Removed from Wishlist",
        "added_to_cart": "Added to Cart",
        "removed_from_cart": "Removed From Cart",
        "cart_quantity_updated": "Cart Qty Updated",
        "total_sessions": "Total Sessions",
        "days_since_last_activity": "Days Since Last Activity",
        "total_spent_usd": "Total Spent (USD)",
    }

def _auto_label(k: str) -> str:
    import re
    s = k.replace("__", "_")
    parts = re.split(r"[_\\-]+", s)
    return " ".join(p.capitalize() for p in parts if p)

RISK_COLORS = {
    "Low": "#10b981",
    "Medium": "#f59e0b",
    "High": "#ef4444",
}

SEGMENT_LABELS = ["High-Value", "Regular", "Occasional", "New"]

MODEL_ACCURACY = 0.763



def bucket_risk(prob: float) -> str:
    """Map probability to Low / Medium / High risk buckets used by the dashboard."""
    if prob >= 0.7:
        return "High"
    if prob >= 0.4:
        return "Medium"
    return "Low"


def classify_segment(total_spent: float, total_sessions: int) -> str:
    """
    Simple heuristic mapping to segments your dashboard uses.
    Tweak thresholds later if you want.
    """
    if total_spent >= 1000 or total_sessions >= 40:
        return "High-Value"
    if total_spent >= 200 or total_sessions >= 15:
        return "Regular"
    if total_spent >= 50 or total_sessions >= 5:
        return "Occasional"
    return "New"


def infer_top_risk_factors(features: Dict[str, Any], top_n: int = 3) -> List[str]:
    """
    Cheap heuristic: choose features with the largest raw values
    and map them to friendly labels.
    """
    # ignore money vs counts differences for now – this is just a human-friendly hint
    sorted_keys = sorted(features.keys(), key=lambda k: float(features[k] or 0), reverse=True)
    top_keys = sorted_keys[:top_n]
    return [FRIENDLY.get(k, _auto_label(k)) for k in top_keys]


def build_feature_importance(features_present: List[str]) -> List[Dict[str, Any]]:
    """
    Build a simple, deterministic feature-importance list
    for the bar chart, prioritizing the most intuitive signals.
    """
    # Order of importance we "prefer" when present
    preferred_order = [
        "days_since_last_activity",
        "total_spent_usd",
        "total_sessions",
        "removed_from_cart",
        "removed_from_wishlist",
        "cart_quantity_updated",
        "added_to_cart",
        "added_to_wishlist",
    ]

    # Filter to only features actually present in this model
    ordered = [f for f in preferred_order if f in features_present]
    if not ordered:
        ordered = features_present

    # Assign descending weights and normalize to 1.0
    n = len(ordered)
    if n == 0:
        return []

    # e.g. n=6 -> [6,5,4,3,2,1] normalized
    raw = list(range(n, 0, -1))
    s = float(sum(raw))
    weights = [r / s for r in raw]

    return [
        {
            "feature": FRIENDLY.get(k, _auto_label(k)),
            "raw_key": k,
            "importance": round(w * 100, 2),  # percentage style for charts
        }
        for k, w in zip(ordered, weights)
    ]


def build_churn_trend(avg_prob: float, high_risk_count: int, periods: int = 8) -> List[Dict[str, Any]]:
    """
    Generate a simple, deterministic trend series for the line chart.
    Uses avg_prob as a base and creates 8 recent points (e.g., weekly).
    You can later replace this with real historical aggregates.
    """
    base = avg_prob * 100.0  # convert to %
    today = datetime.utcnow().date()
    out = []
    # oldest -> newest
    for i in range(periods, 0, -1):
        date = today - timedelta(weeks=i)
        # small deterministic wobble so it's not a flat line
        factor = 0.92 + (i / (periods * 50.0))  # small slope
        churn_rate = round(base * factor, 2)
        interventions = int(high_risk_count * (0.4 + 0.05 * i))
        out.append(
            {
                "date": date.isoformat(),
                "churnRate": churn_rate,
                "interventions": interventions,
            }
        )
    return out


@router.get("/dashboard/{client_id}")
async def analytics_dashboard(
    client_id: int,
    limit: int = 1000,
    db: AsyncSession = Depends(get_db),
):
    """
    One-stop endpoint that returns everything the React Dashboard needs:
    - summary metrics
    - segment data
    - risk distribution
    - feature importance
    - churn trend
    - high-risk customers list
    """

    # 1) Pull features + user info from the MV + users table
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
        # If no rows, just return empty structures the FE can still render
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
        }
        return stamp_meta(empty_payload)

    # 2) Build payload for the model
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

    # 3) Run predictions
    preds = await predict_churn(payload)

    customers: List[Dict[str, Any]] = []
    total_revenue = 0.0
    high_risk_revenue = 0.0

    for i, (features, meta, pred) in enumerate(zip(payload, user_meta, preds)):
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
                "churnProbability": prob,  # 0..1
                "totalSpend": total_spent,
                "topRiskFactors": infer_top_risk_factors(features, top_n=3),
                "features": features,
            }
        )

    # 4) Summary metrics (top cards)
    total_customers = len(customers)
    avg_churn = sum(c["churnProbability"] for c in customers) / total_customers if total_customers else 0.0
    high_risk_count = sum(1 for c in customers if c["riskLevel"] == "High")

    summary = {
        "total_customers": total_customers,
        "avg_churn_probability": avg_churn,  # 0..1, FE can *100 if needed
        "high_risk_count": high_risk_count,
        "total_revenue": total_revenue,
        "revenue_at_risk": high_risk_revenue,
        # These two are currently synthetic; you can wire them to real tables later
        "interventions_this_month": int(high_risk_count * 1.3),
        "model_accuracy": MODEL_ACCURACY,
    }

    # 5) Segment data (for the segment cards)
    seg_counter = Counter(c["segment"] for c in customers)
    segments_payload: List[Dict[str, Any]] = []
    for seg in SEGMENT_LABELS:
        count = seg_counter.get(seg, 0)
        if total_customers == 0:
            pct = 0.0
        else:
            pct = (count / total_customers) * 100.0

        # avg churn & value per segment
        seg_customers = [c for c in customers if c["segment"] == seg]
        if seg_customers:
            avg_churn_seg = sum(c["churnProbability"] for c in seg_customers) / len(seg_customers) * 100.0
            avg_value_seg = sum(c["totalSpend"] for c in seg_customers) / len(seg_customers)
        else:
            avg_churn_seg = 0.0
            avg_value_seg = 0.0

        # choose colors consistent with your FE hardcoded ones
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
                "avgValue": avg_value_seg,  # FE can format as "$xxK"
                "color": color_map.get(seg),
            }
        )

    # 6) Risk distribution (for the pie chart)
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

    # 7) Feature importance (for the horizontal bar chart)
    features_present = list(payload[0].keys()) if payload else []
    feature_importance = build_feature_importance(features_present)

    # 8) Churn trend (for the line chart)
    churn_trend = build_churn_trend(avg_prob=avg_churn, high_risk_count=high_risk_count, periods=8)

    # 9) Recently identified high-risk customers (for last card)
    high_risk_customers = sorted(
        [c for c in customers if c["riskLevel"] == "High"],
        key=lambda c: c["churnProbability"],
        reverse=True,
    )[:5]

    response_payload = {
        "summary": summary,
        "segments": segments_payload,
        "risk_distribution": risk_distribution,
        "feature_importance": feature_importance,
        "churn_trend": churn_trend,
        "high_risk_customers": high_risk_customers,
    }

    return stamp_meta(response_payload)

