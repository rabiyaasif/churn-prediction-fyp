# app/services/report_generator_on_demand.py
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from collections import defaultdict, Counter

from sqlalchemy import text, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import predict_churn
from app.models import Event, User
from app.services.ai_service import generate_executive_summary

# Helper functions
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


async def generate_weekly_report_from_events(
    client_id: int,
    week_ending: date,
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    Generate a weekly report by analyzing events table directly.
    Returns the report data without storing it in the database.
    """
    
    # Calculate week start (7 days before week_ending)
    week_start = week_ending - timedelta(days=6)
    
    # 1) Query events for this week
    events_query = text("""
        SELECT
            user_id,
            event_type,
            timestamp,
            price,
            quantity,
            session_id
        FROM events
        WHERE client_id = :cid
          AND timestamp >= :week_start
          AND timestamp <= :week_end
        ORDER BY user_id, timestamp
    """)
    
    events_res = await db.execute(
        events_query,
        {
            "cid": client_id,
            "week_start": datetime.combine(week_start, datetime.min.time()),
            "week_end": datetime.combine(week_ending, datetime.max.time()),
        }
    )
    events_rows = events_res.mappings().all()
    
    if not events_rows:
        # Return empty report
        return {
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
            "keyInsights": ["No events were recorded for this week."],
            "topRiskFactors": [],
            "segmentBreakdown": [],
            "recommendations": [],
            "executiveSummary": "No activity data was available for this week, so a churn report could not be generated.",
        }
    
    # 2) Aggregate events by user to build features
    user_events: Dict[str, List[Dict]] = defaultdict(list)
    for row in events_rows:
        user_id = row["user_id"]
        if user_id:
            user_events[user_id].append({
                "event_type": row["event_type"],
                "timestamp": row["timestamp"],
                "price": float(row["price"] or 0.0),
                "quantity": int(row["quantity"] or 0),
                "session_id": row["session_id"],
            })
    
    # 3) Build features for each user
    payload: List[Dict[str, Any]] = []
    user_meta: List[Dict[str, Any]] = []
    
    # Get user info
    user_ids_list = list(user_events.keys())
    if user_ids_list:
        users_query = select(User).where(
            User.client_id == client_id,
            User.user_id.in_(user_ids_list)
        )
        users_res = await db.execute(users_query)
        users = {u.user_id: u for u in users_res.scalars().all()}
    else:
        users = {}
    
    # Calculate days since last activity (need to check events before this week)
    today = datetime.utcnow().date()
    
    for user_id, events in user_events.items():
        # Aggregate features from events
        added_to_wishlist = sum(1 for e in events if e["event_type"] == "added_to_wishlist")
        removed_from_wishlist = sum(1 for e in events if e["event_type"] == "removed_from_wishlist")
        added_to_cart = sum(1 for e in events if e["event_type"] == "added_to_cart")
        removed_from_cart = sum(1 for e in events if e["event_type"] == "removed_from_cart")
        cart_quantity_updated = sum(1 for e in events if e["event_type"] == "cart_quantity_updated")
        
        # Count unique sessions
        unique_sessions = len(set(e["session_id"] for e in events if e["session_id"]))
        total_sessions = unique_sessions
        
        # Calculate total spent (from purchase events)
        total_spent = sum(
            e["price"] * e["quantity"] for e in events 
            if e["event_type"] in ["purchase", "order_completed"]
        )
        
        # Get last activity date
        last_activity = max((e["timestamp"] for e in events), default=None)
        if last_activity:
            if isinstance(last_activity, datetime):
                last_activity_date = last_activity.date()
            else:
                last_activity_date = last_activity
            days_since_last_activity = (today - last_activity_date).days
        else:
            days_since_last_activity = 999
        
        features = {
            "added_to_wishlist": added_to_wishlist,
            "removed_from_wishlist": removed_from_wishlist,
            "added_to_cart": added_to_cart,
            "removed_from_cart": removed_from_cart,
            "cart_quantity_updated": cart_quantity_updated,
            "total_sessions": total_sessions,
            "days_since_last_activity": days_since_last_activity,
            "total_spent_usd": total_spent,
        }
        
        payload.append(features)
        user_info = users.get(user_id)
        user_meta.append({
            "user_id": user_id,
            "email": user_info.email if user_info else None,
            "name": user_info.name if user_info else None,
            "features": features,
        })
    
    # 4) Run ML predictions
    if not payload:
        return {
            "summary": {
                "totalCustomers": 0,
                "highRiskCount": 0,
                "churnedThisWeek": 0,
                "retentionRate": 100.0,
                "avgChurnProbability": 0.0,
                "prevWeekComparison": {"highRisk": 0.0, "churned": 0.0, "retention": 0.0},
            },
            "keyInsights": ["No valid user data found for this week."],
            "topRiskFactors": [],
            "segmentBreakdown": [],
            "recommendations": [],
            "executiveSummary": "No valid user activity was found for this week.",
        }
    
    preds = await predict_churn(payload)
    
    # 5) Process predictions
    customers: List[Dict[str, Any]] = []
    total_revenue = 0.0
    
    for info, pred in zip(user_meta, preds):
        features = info["features"]
        p = pred.get("probability")
        y = int(pred.get("prediction", 0))
        score = p if p is not None else (1.0 if y == 1 else 0.0)
        
        prob = float(score)
        risk = bucket_risk(prob)
        
        total_spent = features["total_spent_usd"]
        total_sessions = features["total_sessions"]
        segment = classify_segment(total_spent, total_sessions)
        
        total_revenue += total_spent
        
        customers.append({
            "user_id": info["user_id"],
            "riskLevel": risk,
            "segment": segment,
            "churnProbability": prob,
            "totalSpend": total_spent,
            "features": features,
            "topRiskFactors": infer_top_risk_factors(features, top_n=3),
        })
    
    # 6) Calculate metrics
    total_customers = len(customers)
    avg_churn_prob = (
        sum(c["churnProbability"] for c in customers) / total_customers
        if total_customers
        else 0.0
    )
    high_risk_customers = [c for c in customers if c["riskLevel"] == "High"]
    high_risk_count = len(high_risk_customers)
    
    churned_this_week = sum(
        1 for c in customers if c["churnProbability"] >= 0.8
    )
    
    retention_rate = (
        100.0 * (1.0 - churned_this_week / total_customers)
        if total_customers
        else 100.0
    )
    
    # 7) Compare with previous week (query previous week's events)
    prev_week_ending = week_ending - timedelta(days=7)
    prev_week_start = prev_week_ending - timedelta(days=6)
    
    prev_events_query = text("""
        SELECT COUNT(DISTINCT user_id) as user_count
        FROM events
        WHERE client_id = :cid
          AND timestamp >= :week_start
          AND timestamp <= :week_end
    """)
    
    prev_res = await db.execute(
        prev_events_query,
        {
            "cid": client_id,
            "week_start": datetime.combine(prev_week_start, datetime.min.time()),
            "week_end": datetime.combine(prev_week_ending, datetime.max.time()),
        }
    )
    prev_row = prev_res.mappings().first()
    prev_customer_count = prev_row["user_count"] if prev_row else 0
    
    # Simple comparison (you can enhance this)
    high_delta = 0.0
    churned_delta = 0.0
    ret_delta = 0.0
    
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
    
    # 8) Generate insights
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
    
    # 9) Segment breakdown
    seg_counts = defaultdict(int)
    seg_risk_sum = defaultdict(float)
    
    for c in customers:
        seg = c["segment"]
        seg_counts[seg] += 1
        seg_risk_sum[seg] += c["churnProbability"]
    
    segment_breakdown: List[Dict[str, Any]] = []
    for seg, count in seg_counts.items():
        avg_seg_risk = (seg_risk_sum[seg] / count * 100.0) if count else 0.0
        segment_breakdown.append({
            "segment": seg,
            "count": count,
            "riskLevel": round(avg_seg_risk, 1),
            "trend": "down",  # Simplified - you can enhance this
        })
    
    # 10) Top risk factors
    rf_counter = Counter()
    for c in high_risk_customers:
        for rf in c["topRiskFactors"]:
            rf_counter[rf] += 1
    
    top_risk_factors: List[Dict[str, Any]] = []
    for factor, freq in rf_counter.most_common(5):
        impact = "High" if freq >= max(3, len(high_risk_customers) * 0.2) else "Medium"
        top_risk_factors.append({"factor": factor, "impact": impact})
    
    # 11) Recommendations
    recommendations: List[Dict[str, Any]] = []
    
    if high_risk_count > 0:
        recommendations.append({
            "action": "Launch a targeted win-back campaign for high-risk customers with personalized offers.",
            "priority": "high",
            "expectedImpact": "Reduce churn among the riskiest segment and protect short-term revenue.",
        })
    
    recommendations.append({
        "action": "Monitor segments with rising risk levels and adjust messaging or promotions accordingly.",
        "priority": "medium",
        "expectedImpact": "Stabilize churn trends and prevent further deterioration.",
    })
    
    if retention_rate < 95:
        recommendations.append({
            "action": "Review your onboarding and post-purchase flows to improve early-stage retention.",
            "priority": "medium",
            "expectedImpact": "Increase overall retention rate over the coming weeks.",
        })
    
    # 12) Generate executive summary
    report_payload: Dict[str, Any] = {
        "summary": summary,
        "keyInsights": key_insights,
        "topRiskFactors": top_risk_factors,
        "segmentBreakdown": segment_breakdown,
        "recommendations": recommendations,
    }
    
    executive_summary = generate_executive_summary(report_payload)
    report_payload["executiveSummary"] = executive_summary
    
    return report_payload

