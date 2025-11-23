# app/routes_customer_profiles.py

from typing import List, Dict, Any, Optional
from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.main import predict_churn, stamp_meta

router = APIRouter()

# -------------------------
# Shared helpers (same ideas as routes_analytics)
# -------------------------

FRIENDLY = {
    "added_to_wishlist": "Added to Wishlist",
    "removed_from_wishlist": "Removed from Wishlist",
    "added_to_cart": "Added to Cart",
    "removed_from_cart": "Removed from Cart",
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
    """Map probability to Low / Medium / High risk buckets."""
    if prob >= 0.7:
        return "High"
    if prob >= 0.4:
        return "Medium"
    return "Low"


def classify_segment(total_spent: float, total_sessions: int) -> str:
    """
    Same segmentation as dashboard:
    High-Value / Regular / Occasional / New
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
    Simple heuristic: pick features with highest values.
    """
    sorted_keys = sorted(
        features.keys(), key=lambda k: float(features.get(k) or 0), reverse=True
    )
    top_keys = sorted_keys[:top_n]
    return [FRIENDLY.get(k, _auto_label(k)) for k in top_keys]


def generate_recommendations(
    risk_level: str,
    segment: str,
    churn_prob: float,
    features: Dict[str, Any],
) -> List[str]:
    """
    Very simple rule-based recommendations engine.
    You can refine this later.
    """
    recs: List[str] = []

    days_inactive = int(features.get("days_since_last_activity") or 0)
    total_spent = float(features.get("total_spent_usd") or 0)
    removed_from_cart = int(features.get("removed_from_cart") or 0)
    removed_from_wishlist = int(features.get("removed_from_wishlist") or 0)
    total_sessions = int(features.get("total_sessions") or 0)

    # High-level risk & segment based rules
    if risk_level == "High":
        recs.append("Trigger immediate retention workflow for this customer.")
        if segment == "High-Value":
            recs.append("Offer a personalized high-value discount or loyalty reward.")
            recs.append("Assign an account manager to reach out personally.")
        elif segment == "Regular":
            recs.append("Send a limited-time discount on recently viewed items.")
        elif segment == "Occasional":
            recs.append("Offer free shipping on the next order to encourage return.")
        elif segment == "New":
            recs.append("Send a welcome-back onboarding email with curated picks.")
    elif risk_level == "Medium":
        recs.append("Monitor engagement and send a gentle reminder email.")
        recs.append("Include this customer in your next marketing campaign.")
    else:  # Low
        recs.append("Include in loyalty and upsell campaigns.")
        recs.append("Reward this customer with small perks to maintain loyalty.")

    # Behavior-based rules
    if days_inactive > 60:
        recs.append("Send a reactivation email series highlighting new arrivals.")
    if removed_from_cart > 0:
        recs.append("Send a cart recovery email with a small incentive.")
    if removed_from_wishlist > 0:
        recs.append("Send updated recommendations based on wishlist changes.")
    if total_sessions > 20 and total_spent == 0:
        recs.append("Offer a first-purchase discount to convert this browser.")

    # Ensure uniqueness
    # You can preserve ordering by using dict.fromkeys trick
    recs = list(dict.fromkeys(recs))

    return recs


# -------------------------
# Endpoint: Customer Profiles for a client
# -------------------------

@router.get("/customers/{client_id}")
async def customer_profiles(
    client_id: int,
    limit: int = 500,
    offset: int = 0,
    search: Optional[str] = Query(None, description="Search by name/email/user_id"),
    segment: Optional[str] = Query(None, description="Filter by segment"),
    risk: Optional[str] = Query(None, description="Filter by risk level"),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns a list of customers for a client with fields expected by CustomerProfile.tsx:

    - id
    - name
    - email
    - riskLevel
    - segment
    - churnProbability
    - totalSpend
    - orderCount
    - daysSinceLastPurchase
    - topRiskFactors
    - recommendations
    """

    # 1) Pull base features + user info from churn_user_features_mv + users
    features_q = text(
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
        LIMIT :lim OFFSET :off
        """
    )
    res = await db.execute(
        features_q, {"cid": client_id, "lim": limit, "off": offset}
    )
    rows = res.mappings().all()

    if not rows:
        return stamp_meta({"customers": [], "count": 0})

    # 2) Aggregate orderCount + lastPurchase from events
    events_q = text(
        """
        SELECT
            user_id,
            COUNT(*) FILTER (WHERE event_type = 'purchase') AS order_count,
            MAX(timestamp) FILTER (WHERE event_type = 'purchase') AS last_purchase_at
        FROM events
        WHERE client_id = :cid
        GROUP BY user_id
        """
    )
    events_res = await db.execute(events_q, {"cid": client_id})
    events_rows = events_res.mappings().all()

    order_map: Dict[str, Dict[str, Any]] = {}
    for r in events_rows:
        order_map[r["user_id"]] = {
            "order_count": int(r["order_count"] or 0),
            "last_purchase_at": r["last_purchase_at"],
        }

    # 3) Build payload for model and metadata per user
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

    # 4) Run model predictions
    preds = await predict_churn(payload)

    today = datetime.utcnow().date()
    customers: List[Dict[str, Any]] = []

    for features, meta, pred in zip(payload, user_meta, preds):
        p = pred.get("probability")
        y = int(pred.get("prediction", 0))
        score = p if p is not None else (1.0 if y == 1 else 0.0)

        prob = float(score)
        risk_level = bucket_risk(prob)

        total_spent = features["total_spent_usd"]
        total_sessions = features["total_sessions"]
        segment_label = classify_segment(total_spent, total_sessions)

        # Order count & last purchase
        orders_info = order_map.get(meta["user_id"], {})
        order_count = int(orders_info.get("order_count") or 0)
        last_purchase_at = orders_info.get("last_purchase_at")

        if last_purchase_at:
            last_date = last_purchase_at.date()
            days_since_last_purchase = (today - last_date).days
        else:
            # fallback: use model feature days_since_last_activity
            days_since_last_purchase = int(
                features.get("days_since_last_activity") or 0
            )

        top_risk_factors = infer_top_risk_factors(features, top_n=3)
        recommendations = generate_recommendations(
            risk_level=risk_level,
            segment=segment_label,
            churn_prob=prob,
            features=features,
        )

        customers.append(
            {
                "id": meta["user_id"],
                "name": meta["name"] or f"User {meta['user_id']}",
                "email": meta["email"],
                "riskLevel": risk_level,
                "segment": segment_label,
                "churnProbability": prob,  # 0..1
                "totalSpend": total_spent,
                "orderCount": order_count,
                "daysSinceLastPurchase": days_since_last_purchase,
                "topRiskFactors": top_risk_factors,
                "recommendations": recommendations,
                "features": features,
            }
        )

    # 5) Optional: in-API filtering (to match your FE filters if you want server-side)
    if search:
        s = search.lower()
        customers = [
            c
            for c in customers
            if (c["name"] and s in c["name"].lower())
            or (c["email"] and s in c["email"].lower())
            or (c["id"] and s in str(c["id"]).lower())
        ]

    if segment and segment != "all":
        customers = [c for c in customers if c["segment"] == segment]

    if risk and risk != "all":
        customers = [c for c in customers if c["riskLevel"] == risk]

    return stamp_meta({"customers": customers, "count": len(customers)})
