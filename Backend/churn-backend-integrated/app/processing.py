# app/processing.py
from __future__ import annotations
import pandas as pd
import numpy as np

FEATURES_29 = [
    # 29 training features (exclude 'customer_id', 'snapshot_date')
    "recency_days",
    "frequency",
    "monetary",
    "avg_order_value",
    "max_order_value",
    "total_events",
    "view_count",
    "cart_add_count",
    "refund_count",
    "support_ticket_count",
    "wishlist_add_count",
    "cart_remove_count",
    "wishlist_remove_count",
    "cart_update_count",
    "view_to_cart_rate",
    "cart_to_purchase_rate",
    "overall_conversion_rate",
    "wishlist_to_purchase_rate",
    "cart_abandon_rate",
    "wishlist_abandon_rate",
    "cart_engagement_ratio",
    "category_diversity",
    "dominant_category_ratio",
    "days_active",
    "activity_intensity",
    "activity_trend",
    "purchase_trend",
    "refund_rate",
    "support_intensity",
]

RAW = [
    "added_to_wishlist",
    "removed_from_wishlist",
    "added_to_cart",
    "removed_from_cart",
    "cart_quantity_updated",
    "total_sessions",
    "days_since_last_activity",
    "total_spent_usd",
]

def _safe_div(a, b):
    a = a.astype(float)
    b = b.astype(float)
    return np.where(b == 0, 0.0, a / b)

def feature_engineering(df_in: pd.DataFrame) -> pd.DataFrame:
    """
    Map your 8 raw inputs to the 29-engineered features used by the trained model.
    Unknown signals (views, refunds, support, categories, etc.) are defaulted to 0.
    """
    df = df_in.copy()

    # Ensure missing raw columns exist with 0 defaults
    for col in RAW:
        if col not in df.columns:
            df[col] = 0

    # Alias raw columns to more intuitive names
    wish_add  = df["added_to_wishlist"].astype(float)
    wish_rem  = df["removed_from_wishlist"].astype(float)
    cart_add  = df["added_to_cart"].astype(float)
    cart_rem  = df["removed_from_cart"].astype(float)
    cart_upd  = df["cart_quantity_updated"].astype(float)
    sessions  = df["total_sessions"].astype(float)
    recency   = df["days_since_last_activity"].astype(float)
    monetary  = df["total_spent_usd"].astype(float)

    # Unknowns in your telemetry → default 0 (you can wire real signals later)
    view_count           = pd.Series(0.0, index=df.index)
    refund_count         = pd.Series(0.0, index=df.index)
    support_ticket_count = pd.Series(0.0, index=df.index)
    days_active          = pd.Series(np.maximum(1.0, sessions), index=df.index)  # heuristic
    category_diversity   = pd.Series(0.0, index=df.index)
    dominant_category_ratio = pd.Series(0.0, index=df.index)
    activity_trend       = pd.Series(0.0, index=df.index)
    purchase_trend       = pd.Series(0.0, index=df.index)

    # Purchases proxy: we don’t have explicit order count → infer from spend>0
    purchase_count = (monetary > 0).astype(float)

    total_events = (
        view_count + cart_add + cart_rem + cart_upd +
        wish_add + wish_rem + purchase_count + refund_count + support_ticket_count
    )

    # AOV / Max OV proxies (with no explicit order lines, assume avg ≈ total)
    avg_order_value = np.where(purchase_count > 0, monetary / purchase_count, 0.0)
    max_order_value = avg_order_value  # until you have real per-order rows

    # Rates/ratios (safe divide)
    view_to_cart_rate        = _safe_div(cart_add, np.maximum(1.0, view_count))
    cart_to_purchase_rate    = _safe_div(purchase_count, np.maximum(1.0, cart_add))
    overall_conversion_rate  = _safe_div(purchase_count, np.maximum(1.0, sessions))
    wishlist_to_purchase_rate= _safe_div(purchase_count, np.maximum(1.0, wish_add))
    cart_abandon_rate        = _safe_div(cart_rem, np.maximum(1.0, cart_add + cart_upd))
    wishlist_abandon_rate    = _safe_div(wish_rem, np.maximum(1.0, wish_add))
    cart_engagement_ratio    = _safe_div(cart_add + cart_upd, np.maximum(1.0, sessions))
    activity_intensity       = _safe_div(total_events, np.maximum(1.0, days_active))
    refund_rate              = _safe_div(refund_count, np.maximum(1.0, purchase_count))
    support_intensity        = _safe_div(support_ticket_count, np.maximum(1.0, days_active))

    out = pd.DataFrame({
        "recency_days": recency,
        "frequency": sessions,               # proxy
        "monetary": monetary,
        "avg_order_value": avg_order_value,
        "max_order_value": max_order_value,
        "total_events": total_events,
        "view_count": view_count,
        "cart_add_count": cart_add,
        "refund_count": refund_count,
        "support_ticket_count": support_ticket_count,
        "wishlist_add_count": wish_add,
        "cart_remove_count": cart_rem,
        "wishlist_remove_count": wish_rem,
        "cart_update_count": cart_upd,
        "view_to_cart_rate": view_to_cart_rate,
        "cart_to_purchase_rate": cart_to_purchase_rate,
        "overall_conversion_rate": overall_conversion_rate,
        "wishlist_to_purchase_rate": wishlist_to_purchase_rate,
        "cart_abandon_rate": cart_abandon_rate,
        "wishlist_abandon_rate": wishlist_abandon_rate,
        "cart_engagement_ratio": cart_engagement_ratio,
        "category_diversity": category_diversity,
        "dominant_category_ratio": dominant_category_ratio,
        "days_active": days_active,
        "activity_intensity": activity_intensity,
        "activity_trend": activity_trend,
        "purchase_trend": purchase_trend,
        "refund_rate": refund_rate,
        "support_intensity": support_intensity,
    }, index=df.index)

    # Ensure exact column order
    out = out.reindex(columns=FEATURES_29, fill_value=0.0)
    return out
