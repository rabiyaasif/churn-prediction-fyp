# app/services/report_generator.py
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from collections import defaultdict, Counter

from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import predict_churn
from app.models import WeeklyReport
from app.services.ai_service import generate_executive_summary

# Same helpers as analytics_dashboard / customer_profiles:

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


def bucket_risk(prob: float) -> str:
    if prob >= 0.7:
        return "High"
    if prob >= 0.4:
        return "Medium"
    return "Low"


def classify_segment(total_spent: float, total_sessions: int) -> str:
    if total_spent >= 1000 or total_sessions >= 40:
        return "High-Value"
    if total_spent >= 200 or total_sessions >= 15:
        return "Regular"
    if total_spent >= 50 or total_sessions >= 5:
        return "Occasional"
    return "New"


def infer_top_risk_factors(features: Dict[str, Any], top_n: int = 3) -> List[str]:
    sorted_keys = sorted(
        features.keys(), key=lambda k: float(features.get(k) or 0), reverse=True
    )
    top_keys = sorted_keys[:top_n]
    return [FRIENDLY.get(k, _auto_label(k)) for k in top_keys]


async def get_previous_report(
    client_id: int, week_ending: date, db: AsyncSession
) -> Optional[WeeklyReport]:
    stmt = (
        select(WeeklyReport)
        .where(
            WeeklyReport.client_id == client_id,
            WeeklyReport.week_ending < week_ending,
        )
        .order_by(WeeklyReport.week_ending.desc())
        .limit(1)
    )
    res = await db.execute(stmt)
    return res.scalars().first()


async def generate_weekly_report(
    client_id: int,
    week_ending: date,
    db: AsyncSession,
) -> WeeklyReport:
    """
    Main orchestrator:
    - Pulls features from churn_user_features_mv
    - Runs predict_churn
    - Aggregates metrics
    - Generates insights & recommendations
    - Calls Gemini for executive summary
    - Stores JSON report in weekly_reports
    """

    # 1) Pull features for this client (similar to analytics_dashboard)
    # For now, we don't filter by week_ending at SQL level because your MV
    # already contains "current" features (days_since_last_activity, etc.).
    # You can later add a snapshot table if needed.
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
            f.total_spent_usd
        FROM churn_user_features_mv AS f
        WHERE f.client_id = :cid
        ORDER BY f.user_id
        """
    )
    res = await db.execute(q, {"cid": client_id})
    rows = res.mappings().all()

    if not rows:
        # Still store an "empty" report so FE can show that nothing was available.
        empty_report_data = {
            "summary": {
                "totalCustomers": 0,
                "highRiskCount": 0,
                "churnedThisWeek": 0,
                "retentionRate": 100.0,
                "avgChurnProbability": 0.0,
                "prevWeekComparison": {
                    "highRisk": 0.0,
                    "churned": 0.0,
                    "retention": 0.0,
                },
            },
            "keyInsights": ["No customer data was available for this week."],
            "topRiskFactors": [],
            "segmentBreakdown": [],
            "recommendations": [],
            "executiveSummary": (
                "No activity data was available for this week, so a churn report "
                "could not be generated."
            ),
        }

        weekly = WeeklyReport(
            client_id=client_id,
            week_ending=week_ending,
            report_data=empty_report_data,
        )
        db.add(weekly)
        await db.commit()
        await db.refresh(weekly)
        return weekly

    # 2) Build payload for model
    payload: List[Dict[str, Any]] = []
    meta: List[Dict[str, Any]] = []

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
        meta.append({"user_id": r["user_id"], "features": features})

    # 3) Run predictions
    preds = await predict_churn(payload)

    customers: List[Dict[str, Any]] = []
    total_revenue = 0.0

    for info, pred in zip(meta, preds):
        features = info["features"]
        p = pred.get("probability")
        y = int(pred.get("prediction", 0))
        score = p if p is not None else (1.0 if y == 1 else 0.0)

        prob = float(score)  # 0..1
        risk = bucket_risk(prob)

        total_spent = features["total_spent_usd"]
        total_sessions = features["total_sessions"]
        segment = classify_segment(total_spent, total_sessions)

        total_revenue += total_spent

        customers.append(
            {
                "user_id": info["user_id"],
                "riskLevel": risk,
                "segment": segment,
                "churnProbability": prob,
                "totalSpend": total_spent,
                "features": features,
                "topRiskFactors": infer_top_risk_factors(features, top_n=3),
            }
        )

    # 4) Aggregated metrics
    total_customers = len(customers)
    avg_churn_prob = (
        sum(c["churnProbability"] for c in customers) / total_customers
        if total_customers
        else 0.0
    )
    high_risk_customers = [c for c in customers if c["riskLevel"] == "High"]
    high_risk_count = len(high_risk_customers)

    # Very simple proxy for "churned this week":
    # count of users with predicted label 1 (or prob >= 0.8).
    churned_this_week = sum(
        1 for c in customers if c["churnProbability"] >= 0.8
    )

    retention_rate = (
        100.0 * (1.0 - churned_this_week / total_customers)
        if total_customers
        else 100.0
    )

    # 5) Compare with previous week's report (if exists)
    prev = await get_previous_report(client_id, week_ending, db)
    if prev:
        prev_summary = prev.report_data.get("summary", {})
        prev_high = prev_summary.get("highRiskCount", 0) or 0
        prev_churned = prev_summary.get("churnedThisWeek", 0) or 0
        prev_ret = prev_summary.get("retentionRate", 0.0) or 0.0

        def pct_delta(current: float, previous: float) -> float:
            if previous == 0:
                return 0.0
            return ((current - previous) / previous) * 100.0

        high_delta = pct_delta(high_risk_count, prev_high)
        churned_delta = pct_delta(churned_this_week, prev_churned)
        ret_delta = retention_rate - prev_ret
    else:
        high_delta = churned_delta = ret_delta = 0.0

    summary = {
        "totalCustomers": total_customers,
        "highRiskCount": high_risk_count,
        "churnedThisWeek": churned_this_week,
        "retentionRate": round(retention_rate, 1),
        "avgChurnProbability": round(avg_churn_prob, 4),
        "prevWeekComparison": {
            "highRisk": round(high_delta, 1),
            "churned": round(churned_delta, 1),
            "retention": round(ret_delta, 1),
        },
    }

    # 6) Build keyInsights
    key_insights: List[str] = []

    if high_risk_count > 0:
        key_insights.append(
            f"{high_risk_count} customers are currently classified as high churn risk."
        )
    if churned_this_week > 0:
        key_insights.append(
            f"{churned_this_week} customers are estimated to have churned this week based on model predictions."
        )
    key_insights.append(
        f"Average churn probability across your base is {avg_churn_prob*100:.1f}%."
    )

    # Segment breakdown
    seg_counts = defaultdict(int)
    seg_risk_sum = defaultdict(float)

    for c in customers:
        seg = c["segment"]
        seg_counts[seg] += 1
        seg_risk_sum[seg] += c["churnProbability"]

    segment_breakdown: List[Dict[str, Any]] = []
    for seg, count in seg_counts.items():
        avg_seg_risk = (
            (seg_risk_sum[seg] / count) * 100.0 if count else 0.0
        )  # %
        # trend: compare to previous week if we have that segment there
        prev_seg_risk = None
        if prev:
            prev_segs = prev.report_data.get("segmentBreakdown", [])
            for s in prev_segs:
                if s.get("segment") == seg:
                    prev_seg_risk = float(s.get("riskLevel") or 0.0)
                    break
        if prev_seg_risk is None:
            trend = "down"
        else:
            trend = "up" if avg_seg_risk > prev_seg_risk else "down"

        segment_breakdown.append(
            {
                "segment": seg,
                "count": count,
                "riskLevel": round(avg_seg_risk, 1),  # %
                "trend": trend,
            }
        )

    # Aggregate top risk factors (across high-risk customers)
    rf_counter = Counter()
    for c in high_risk_customers:
        for rf in c["topRiskFactors"]:
            rf_counter[rf] += 1

    top_risk_factors: List[Dict[str, Any]] = []
    for factor, freq in rf_counter.most_common(5):
        impact = "High" if freq >= max(3, len(high_risk_customers) * 0.2) else "Medium"
        top_risk_factors.append({"factor": factor, "impact": impact})

    # Very simple rule-based recommendations
    recommendations: List[Dict[str, Any]] = []

    if high_risk_count > 0:
        recommendations.append(
            {
                "action": "Launch a targeted win-back campaign for high-risk customers with personalized offers.",
                "priority": "high",
                "expectedImpact": "Reduce churn among the riskiest segment and protect short-term revenue.",
            }
        )

    recommendations.append(
        {
            "action": "Monitor segments with rising risk levels and adjust messaging or promotions accordingly.",
            "priority": "medium",
            "expectedImpact": "Stabilize churn trends and prevent further deterioration.",
        }
    )

    if retention_rate < 95:
        recommendations.append(
            {
                "action": "Review your onboarding and post-purchase flows to improve early-stage retention.",
                "priority": "medium",
                "expectedImpact": "Increase overall retention rate over the coming weeks.",
            }
        )

    # 7) Call Gemini to generate executive summary
    # Assemble the payload in the EXACT shape the FE expects
    report_payload: Dict[str, Any] = {
        "summary": summary,
        "keyInsights": key_insights,
        "topRiskFactors": top_risk_factors,
        "segmentBreakdown": segment_breakdown,
        "recommendations": recommendations,
    }

    executive_summary = generate_executive_summary(report_payload)
    report_payload["executiveSummary"] = executive_summary

    # 8) Store in DB
    weekly = WeeklyReport(
        client_id=client_id,
        week_ending=week_ending,
        report_data=report_payload,
    )
    db.add(weekly)
    await db.commit()
    await db.refresh(weekly)
    return weekly

