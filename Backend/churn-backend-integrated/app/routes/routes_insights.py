from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Dict, Any
from datetime import datetime, timezone

from app.db import get_db
from app.main import predict_churn
from app.routes.routes_analytics import (
    bucket_risk,
    classify_segment,
    infer_top_risk_factors,
)

router = APIRouter(prefix="/high-risk", tags=["High Risk Explorer"])


@router.get("/{client_id}")
async def high_risk_customers(
    client_id: int,
    limit: int = 500,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns ONLY high-risk customers with all fields required by EventExplorer.tsx
    """

    q = text("""
        SELECT
            f.user_id,
            f.added_to_cart, f.removed_from_cart, f.cart_quantity_updated,
            f.added_to_wishlist, f.removed_from_wishlist,
            f.total_sessions, f.days_since_last_activity,
            f.total_spent_usd,

            u.email,
            u.name,

            COALESCE(
              (SELECT MAX(timestamp)
               FROM events e
               WHERE e.client_id=f.client_id
               AND e.user_id=f.user_id
               AND e.event_type='order_completed'),
            NOW() - INTERVAL '120 days') AS last_purchase
        FROM churn_user_features_mv f
        LEFT JOIN users u
            ON u.user_id = f.user_id
           AND u.client_id = f.client_id
        WHERE f.client_id=:cid
        ORDER BY f.user_id
        LIMIT :lim
    """)

    rows = (await db.execute(q, {"cid": client_id, "lim": limit})).mappings().all()
    if not rows:
        return {"high_risk_count": 0, "customers": []}

    # Build model input
    payload, meta = [], []
    for r in rows:
        feats = {
            "added_to_wishlist": int(r["added_to_wishlist"] or 0),
            "removed_from_wishlist": int(r["removed_from_wishlist"] or 0),
            "added_to_cart": int(r["added_to_cart"] or 0),
            "removed_from_cart": int(r["removed_from_cart"] or 0),
            "cart_quantity_updated": int(r["cart_quantity_updated"] or 0),
            "total_sessions": int(r["total_sessions"] or 0),
            "days_since_last_activity": int(r["days_since_last_activity"] or 0),
            "total_spent_usd": float(r["total_spent_usd"] or 0),
        }
        payload.append(feats)

        meta.append({
            "user_id": r["user_id"],
            "email": r["email"],
            "name": r["name"],
            "last_purchase": r["last_purchase"]
        })

    # Run model
    preds = await predict_churn(payload)

    customers: List[Dict[str, Any]] = []
    revenue_at_risk = 0

    for feats, m, p in zip(payload, meta, preds):
        prob = float(p.get("probability") or 0)
        risk = bucket_risk(prob)
        if risk != "High":
            continue

        total_spend = feats["total_spent_usd"]
        revenue_at_risk += total_spend

        # Convert last purchase → N days ago
        last = m["last_purchase"]

        if last.tzinfo is None:
           last = last.replace(tzinfo=timezone.utc)

        days_since = (datetime.now(timezone.utc) - last).days

        customers.append({
            "id": m["user_id"],
            "name": m["name"] or f"User {m['user_id']}",
            "email": m["email"],
            "segment": classify_segment(total_spend, feats["total_sessions"]),
            "daysSinceLastPurchase": days_since,
            "churnProbability": prob,
            "totalSpend": total_spend,
            "topRiskFactors": infer_top_risk_factors(feats, 3),

            # ❤️ **STATIC BUT REALISTIC ACTIONS**
            "recommendations": [
                "Send 20% discount code",
                "Trigger win-back email",
                "Offer premium support call"
            ],
        })

    avg_prob = (
        sum(c["churnProbability"] for c in customers) / len(customers)
        if customers else 0
    )

    return {
        "high_risk_count": len(customers),
        "revenue_at_risk": revenue_at_risk,
        "avg_churn_probability": avg_prob,
        "customers": sorted(customers, key=lambda x: x["churnProbability"], reverse=True),
    }
