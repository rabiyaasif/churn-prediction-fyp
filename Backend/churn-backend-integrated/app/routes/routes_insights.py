from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from app.db import get_db
from app.main import predict_churn
from app.routes.routes_analytics import (
    bucket_risk,
    classify_segment,
    infer_top_risk_factors,
)

router = APIRouter()


@router.get("/{client_id}")
async def high_risk_customers(
    client_id: int,
    limit: int = 500,
    offset: int = 0,
    segment: Optional[str] = None,
    risk: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all customers with their churn predictions, emails, and risk levels.
    Supports filtering by risk level (High/Medium/Low/all) and segment.
    Includes users even if they have no events (uses default feature values).
    Supports pagination with limit and offset.
    """

    q = text("""
        SELECT
            u.user_id,
            u.email,
            u.name,
            
            -- Features from materialized view (NULL if user has no events)
            COALESCE(f.added_to_cart, 0) AS added_to_cart,
            COALESCE(f.removed_from_cart, 0) AS removed_from_cart,
            COALESCE(f.cart_quantity_updated, 0) AS cart_quantity_updated,
            COALESCE(f.added_to_wishlist, 0) AS added_to_wishlist,
            COALESCE(f.removed_from_wishlist, 0) AS removed_from_wishlist,
            COALESCE(f.total_sessions, 0) AS total_sessions,
            COALESCE(f.days_since_last_activity, 999) AS days_since_last_activity,
            COALESCE(f.total_spent_usd, 0) AS total_spent_usd,

            COALESCE(
              (SELECT MAX(timestamp)
               FROM events e
               WHERE e.client_id=u.client_id
               AND e.user_id=u.user_id
               AND e.event_type='purchase'),
            NOW() - INTERVAL '120 days') AS last_purchase
        FROM users u
        LEFT JOIN churn_user_features_mv f
            ON f.user_id = u.user_id
           AND f.client_id = u.client_id
        WHERE u.client_id=:cid
        ORDER BY u.user_id
        LIMIT :lim OFFSET :off
    """)

    rows = (await db.execute(q, {"cid": client_id, "lim": limit, "off": offset})).mappings().all()
    if not rows:
        return {
            "total_customers": 0,
            "high_risk_count": 0,
            "revenue_at_risk": 0,
            "avg_churn_probability": 0,
            "customers": []
        }
    print('*8888888*********************************')
    print(f"Found {len(rows)} rows")
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
    print('---------------------------------------------------')
    print('i am in meta')
    print(meta)
    print('---------------------------------------------------')
    print(payload)  
    print('---------------------------------------------------')
    print(f"Built payload with {len(payload)} items")

    # Run model
    try:
        preds = await predict_churn(payload)
        print(f"Got {len(preds)} predictions")
    except Exception as e:
        print(f"ERROR in predict_churn: {e}")
        import traceback
        traceback.print_exc()
        return {"high_risk_count": 0, "customers": [], "error": str(e)}

    if len(preds) != len(payload):
        print(f"WARNING: Mismatch - {len(payload)} payload items but {len(preds)} predictions")

    customers: List[Dict[str, Any]] = []
    revenue_at_risk = 0

    for feats, m, p in zip(payload, meta, preds):
        try:
            prob = float(p.get("probability") or 0)
            risk_level = bucket_risk(prob)
            
            # Apply risk filter if specified (default: show all)
            if risk and risk != "all" and risk_level != risk:
                continue

            total_spend = feats["total_spent_usd"]
            if risk_level == "High":
                revenue_at_risk += total_spend

            # Convert last purchase → N days ago
            last = m["last_purchase"]
            
            if last is None:
                # Use days_since_last_activity as fallback
                days_since = int(feats.get("days_since_last_activity") or 999)
            else:
                if last.tzinfo is None:
                    last = last.replace(tzinfo=timezone.utc)
                days_since = (datetime.now(timezone.utc) - last).days

            # Generate recommendations based on risk level
            recommendations = []
            if risk_level == "High":
                recommendations = [
                    "Send 20% discount code",
                    "Trigger win-back email",
                    "Offer premium support call"
                ]
            elif risk_level == "Medium":
                recommendations = [
                    "Send engagement email",
                    "Offer personalized recommendations",
                    "Invite to loyalty program"
                ]
            else:
                recommendations = [
                    "Maintain regular communication",
                    "Offer upsell opportunities",
                    "Request feedback and reviews"
                ]

            customers.append({
                "id": m["user_id"],
                "name": m["name"] or f"User {m['user_id']}",
                "email": m["email"],
                "riskLevel": risk_level,  # High, Medium, or Low
                "segment": classify_segment(total_spend, feats["total_sessions"]),
                "daysSinceLastPurchase": days_since,
                "churnProbability": prob,
                "totalSpend": total_spend,
                "topRiskFactors": infer_top_risk_factors(feats, 3),
                "recommendations": recommendations,
            })
        except Exception as e:
            print(f"ERROR processing customer {m.get('user_id', 'unknown')}: {e}")
            import traceback
            traceback.print_exc()
            continue

    # Apply segment filter if provided
    if segment and segment != "all":
        customers = [c for c in customers if c["segment"] == segment]

    # Calculate statistics
    total_customers = len(customers)
    high_risk_customers = [c for c in customers if c["riskLevel"] == "High"]
    high_risk_count = len(high_risk_customers)
    
    avg_prob = (
        sum(c["churnProbability"] for c in customers) / total_customers
        if total_customers > 0 else 0
    )

    # Recalculate revenue at risk (only from high-risk customers)
    revenue_at_risk = sum(c["totalSpend"] for c in high_risk_customers)

    return {
        "total_customers": total_customers,
        "high_risk_count": high_risk_count,
        "revenue_at_risk": revenue_at_risk,
        "avg_churn_probability": avg_prob,
        "customers": sorted(customers, key=lambda x: x["churnProbability"], reverse=True),
    }
