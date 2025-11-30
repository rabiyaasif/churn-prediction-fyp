# app/main.py

import secrets
from datetime import datetime
from typing import List, Union

from fastapi import FastAPI, Body, Depends, Header, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, conint, confloat

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

# ✅ use centralized DB utilities only (do NOT create engine/session here)
from app.db import engine, get_db
from app.models import Base
from app import models, schemas

# ✅ ML utilities
from app.ml import predict_churn, get_expected_features
from app import ml
from app.meta import stamp_meta

from app.deps_common import common_query

from app.meta import MODEL_VERSION, LAST_TRAINED_AT  # NEW
          
import re

from app.routes import routes_analytics
from app.routes import churn_page
from app.routes import routes_customer_profiles
from app.routes import routes_insights
from app.routes import routes_emails



app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change to your FE origins in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Preload model
    ml.load_pipeline()


@app.get("/")
async def root():
    return {"message": "API is running"}


# --------------------------
# Auth helper moved to app.deps to avoid circular imports
# --------------------------
from app.deps import verify_api_key


# --------------------------
# Clients
# --------------------------
@app.post("/clients/", response_model=schemas.ClientOut)
async def create_client(client: schemas.ClientCreate, db: AsyncSession = Depends(get_db)):
    # Check if email already exists
    result = await db.execute(select(models.Client).where(models.Client.email == client.email))
    existing_client = result.scalars().first()
    if existing_client:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Please use a different email or log in."
        )
    
    api_key = secrets.token_hex(32)
    new_client = models.Client(
        name=client.name,
        email=client.email,
        domain=client.domain,
        api_key=api_key,
        password=client.password,
        url=client.url,
    )
    db.add(new_client)
    await db.commit()
    await db.refresh(new_client)
    return new_client


@app.post("/clients/login")
async def login_client(login_data: schemas.ClientLogin, db: AsyncSession = Depends(get_db)):
    # Normalize email (trim and lowercase for case-insensitive matching)
    email_input = login_data.email.strip() if login_data.email else ""
    password_input = login_data.password.strip() if login_data.password else ""
    
    if not email_input:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )
    
    if not password_input:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required"
        )
    
    # Use case-insensitive email matching
    # Try both exact match (case-insensitive) and ilike for compatibility
    result = await db.execute(
        select(models.Client).where(
            models.Client.email.ilike(email_input)
        )
    )
    client = result.scalars().first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid email or password"
        )
    
    # Compare passwords (exact match, trimmed)
    if client.password != password_input:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid email or password"
        )
    
    return {"api_key": client.api_key, "client_id": client.client_id}


@app.get("/clients/{client_id}", response_model=schemas.ClientOut)
async def get_client(client_id: str, db: AsyncSession = Depends(get_db)):
    client = await db.get(models.Client, int(client_id))
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@app.put("/clients/{client_id}", response_model=schemas.ClientOut)
async def update_client(client_id: str, client_update: schemas.ClientUpdate, db: AsyncSession = Depends(get_db)):
    client = await db.get(models.Client, int(client_id))
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if client_update.name is not None:
        client.name = client_update.name
    if client_update.domain is not None:
        client.domain = client_update.domain
    await db.commit()
    await db.refresh(client)
    return client


@app.delete("/clients/{client_id}", status_code=204)
async def delete_client(client_id: str, db: AsyncSession = Depends(get_db)):
    client = await db.get(models.Client, int(client_id))
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    await db.delete(client)
    await db.commit()
    return


# --------------------------
# Client Profile (require API key)
# --------------------------
@app.get("/clients/profile/me", response_model=schemas.ClientOut)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key),
):
    """Get current client's profile using API key"""
    return client


@app.put("/clients/profile/me", response_model=schemas.ClientOut)
async def update_my_profile(
    profile_update: schemas.ClientProfileUpdate,
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key),
):
    """Update current client's profile. Password is optional."""
    has_changes = False
    
    # Update name if first_name or last_name provided
    if profile_update.first_name is not None or profile_update.last_name is not None:
        # Get current name parts (assume first word is first name, rest is last name)
        current_name_parts = client.name.split(" ") if client.name else []
        current_first = current_name_parts[0] if len(current_name_parts) > 0 else ""
        current_last = " ".join(current_name_parts[1:]) if len(current_name_parts) > 1 else ""
        
        # Use provided values or keep existing
        new_first = profile_update.first_name if profile_update.first_name is not None else current_first
        new_last = profile_update.last_name if profile_update.last_name is not None else current_last
        
        # Combine into full name
        name_parts = []
        if new_first:
            name_parts.append(new_first)
        if new_last:
            name_parts.append(new_last)
        
        new_name = " ".join(name_parts).strip()
        
        if new_name and new_name != client.name:
            client.name = new_name
            has_changes = True
    
    # Update email if provided
    if profile_update.email is not None and profile_update.email != client.email:
        # Check if email already exists for another client
        result = await db.execute(
            select(models.Client).where(
                models.Client.email == profile_update.email,
                models.Client.client_id != client.client_id
            )
        )
        existing_client = result.scalars().first()
        if existing_client:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered by another account."
            )
        client.email = profile_update.email
        has_changes = True
    
    # Update password if both current and new passwords are provided
    # If only one is provided, ignore it (don't update password, don't error)
    if profile_update.current_password is not None and profile_update.new_password is not None:
        # Verify current password
        if client.password != profile_update.current_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect"
            )
        # Update password
        client.password = profile_update.new_password
        has_changes = True
    # If only one password field is provided, silently ignore it (no error)
    
    # Only commit if there are actual changes
    if not has_changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No changes to save. Please update at least one field."
        )
    
    await db.commit()
    await db.refresh(client)
    return client


# --------------------------
# Analytics (require API key)
# --------------------------
@app.get("/api/best-selling")
async def best_selling(db: AsyncSession = Depends(get_db), client: models.Client = Depends(verify_api_key)):
    q = text("SELECT * FROM top_products_mv WHERE client_id = :client_id ORDER BY total_quantity_sold DESC LIMIT 10;")
    result = await db.execute(q, {"client_id": client.client_id})
    return result.mappings().all()


# @app.get("/api/sales-over-time")
# async def sales_over_time(db: AsyncSession = Depends(get_db), client: models.Client = Depends(verify_api_key)):
    q = text("SELECT * FROM sales_over_time WHERE client_id = :client_id;")
    base_sql = """
        SELECT *
        FROM sales_over_time
        WHERE client_id = :client_id
          AND date >= :from::date
          AND date < (:to::date + INTERVAL '1 day')
        ORDER BY date ASC
        LIMIT :limit OFFSET :offset
    """
    params = {
        "client_id": client.client_id,
        "from": str(q["from"]),
        "to": str(q["to"]),
        "limit": q["limit"],
        "offset": q["offset"],
    }
    result = await db.execute(text(base_sql), params)
    result = await db.execute(q, {"client_id": client.client_id})
    return result.mappings().all()

@app.get("/api/sales-over-time")
async def sales_over_time(
    q = Depends(common_query),
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key)
):
    base_sql = """
        SELECT *
        FROM sales_over_time
        WHERE client_id = :client_id
          AND date >= :from::date
          AND date < (:to::date + INTERVAL '1 day')
        ORDER BY date ASC
        LIMIT :limit OFFSET :offset
    """
    params = {
        "client_id": client.client_id,
        "from": str(q["from"]),
        "to": str(q["to"]),
        "limit": q["limit"],
        "offset": q["offset"],
    }
    result = await db.execute(text(base_sql), params)
    rows = result.mappings().all()
    return stamp_meta(rows)





@app.get("/api/neglected_items")
async def neglected_items(db: AsyncSession = Depends(get_db), client: models.Client = Depends(verify_api_key)):
    q = text("SELECT * FROM neglected_items WHERE client_id = :client_id;")
    result = await db.execute(q, {"client_id": client.client_id})
    return result.mappings().all()


# --------------------------
# Users (require API key)
# --------------------------
@app.post("/users/", response_model=schemas.UserOut)
async def create_user(
    user: schemas.UserCreate,
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key),
):
    new_user = models.User(
        client_id=client.client_id,
        user_id=user.user_id,
        email=user.email,
        name=user.name,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@app.post("/users/bulk", status_code=201)
async def bulk_insert_users(
    users: List[schemas.UserCreate],
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key),
):
    objs = [
        models.User(
            client_id=client.client_id,
            user_id=u.user_id,
            email=u.email,
            name=u.name,
        )
        for u in users
    ]
    db.add_all(objs)
    await db.commit()
    return {"inserted": len(objs)}


@app.put("/users/{user_id}", response_model=schemas.UserOut)
async def update_user(
    user_id: str,
    user_update: schemas.UserUpdate,
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key),
):
    result = await db.execute(
        select(models.User).where(
            models.User.user_id == user_id,
            models.User.client_id == client.client_id,
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user_update.email is not None:
        user.email = user_update.email
    if user_update.name is not None:
        user.name = user_update.name
    await db.commit()
    await db.refresh(user)
    return user


@app.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key),
):
    result = await db.execute(
        select(models.User).where(
            models.User.user_id == user_id,
            models.User.client_id == client.client_id,
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
    return


# --------------------------
# Products (require API key)
# --------------------------
@app.post("/products/bulk", status_code=201)
async def bulk_insert_products(
    products: List[schemas.ProductCreate],
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key),
):
    objs = [
        models.Product(
            client_id=client.client_id,
            product_id=p.product_id,
            name=p.name,
            description=p.description,
            category=p.category,
            price=p.price,
            currency=p.currency,
        )
        for p in products
    ]
    db.add_all(objs)
    await db.commit()
    return {"inserted": len(objs)}


@app.put("/products/{product_id}", response_model=schemas.ProductOut)
async def update_product(
    product_id: str,
    product_update: schemas.ProductUpdate,
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key),
):
    result = await db.execute(
        select(models.Product).where(
            models.Product.product_id == product_id,
            models.Product.client_id == client.client_id,
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product_update.name is not None:
        product.name = product_update.name
    if product_update.description is not None:
        product.description = product_update.description
    if product_update.category is not None:
        product.category = product_update.category
    if product_update.price is not None:
        product.price = product_update.price
    if product_update.currency is not None:
        product.currency = product_update.currency

    await db.commit()
    await db.refresh(product)
    return product


@app.delete("/products/{product_id}", status_code=204)
async def delete_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key),
):
    result = await db.execute(
        select(models.Product).where(
            models.Product.product_id == product_id,
            models.Product.client_id == client.client_id,
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.delete(product)
    await db.commit()
    return


# --------------------------
# Events (require API key)
# --------------------------
@app.post("/events/bulk", status_code=201)
async def bulk_insert_events(
    request: Request,
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key),
):
    try:
        body = await request.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid JSON in request body: {str(e)}"
        )
    
    # Normalize to list format
    if isinstance(body, dict):
        # Single event object
        try:
            event = schemas.EventCreate(**body)
            events_list = [event]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid event data: {str(e)}"
            )
    elif isinstance(body, list):
        # List of events
        events_list = []
        for idx, item in enumerate(body):
            try:
                event = schemas.EventCreate(**item)
                events_list.append(event)
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid event in array at index {idx}: {str(e)}"
                )
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid request body. Expected a single event object or an array of events."
        )

    objs = []
    for ev in events_list:
        objs.append(
            models.Event(
                client_id=client.client_id,
                user_id=ev.user_id if ev.user_id else None,
                product_id=ev.product_id if ev.product_id else None,
                email=ev.email if ev.email else None,
                event_type=ev.event_type,
                session_id=ev.session_id,
                quantity=ev.quantity,
                price=ev.price,
                timestamp=ev.timestamp or datetime.utcnow(),
                extra_data=ev.extra_data,
            )
        )
    db.add_all(objs)
    await db.commit()
    return {"inserted": len(objs)}


@app.delete("/events/{event_id}", status_code=204)
async def delete_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key),
):
    result = await db.execute(
        select(models.Event).where(
            models.Event.event_id == int(event_id),
            models.Event.client_id == client.client_id,
        )
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.delete(event)
    await db.commit()
    return


# --------------------------
# Churn Prediction (NO AUTH)
# --------------------------
class ChurnFeatures(BaseModel):
    added_to_wishlist: conint(ge=0) = 0
    removed_from_wishlist: conint(ge=0) = 0
    added_to_cart: conint(ge=0) = 0
    removed_from_cart: conint(ge=0) = 0
    cart_quantity_updated: conint(ge=0) = 0
    total_sessions: conint(ge=0) = 0
    days_since_last_activity: conint(ge=0) = 0
    total_spent_usd: confloat(ge=0) = 0.0
    model_config = ConfigDict(extra="forbid")

from fastapi.responses import JSONResponse
import traceback

@app.post("/predict")
async def predict_endpoint(
    instances: List[ChurnFeatures] = Body(...), 
    threshold: float = 0.5
):
    try:
        # Convert Pydantic objects → raw dicts
        payload = [i.model_dump() for i in instances]

        # Get predictions
        results = await predict_churn(payload)

        output = []
        for i, r in enumerate(results):
            p = r.get("probability")
            y = int(r.get("prediction", 0))

            # fallback if no probas
            score = p if p is not None else (1.0 if y == 1 else 0.0)

            output.append({
                "index": r.get("index", i),

                # ✅ FIXED HERE — return original input!
                "features": instances[i].model_dump(),

                "prediction": y,
                "probability": p,
                "threshold": threshold,
                "is_churn": score >= threshold,
                "label": "churn" if score >= threshold else "retain"
            })

        # ✅ add metadata
        return stamp_meta({
            "results": output,
            "count": len(output)
        })

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "traceback": traceback.format_exc()}
        )

    try:
        payload = [i.model_dump() for i in instances]
        results = await predict_churn(payload)

        # pretty output (optional)
        out = []
        for i, r in enumerate(results):
            p = r.get("probability")
            y = int(r.get("prediction", 0))
            score = p if p is not None else (1.0 if y == 1 else 0.0)
            out.append({
                "index": r.get("index", i),
                "features": payload[i],
                "prediction": y,
                "probability": p,
                "threshold": threshold,
                "is_churn": score >= threshold,
                "label": "churn" if score >= threshold else "retain"
            })
        return stamp_meta({"results": out})

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "traceback": traceback.format_exc()}
        )



@app.get("/predict/client/{client_id}")
async def predict_for_client(
    client_id: int,
    limit: int = 100,
    threshold: float = 0.5,
    db: AsyncSession = Depends(get_db),
):
    """
    Pull model-ready rows from churn_user_features_mv for a client,
    run predictions, and return results joined to user_id.
    """
    q = text("""
        SELECT
            user_id,
            added_to_wishlist,
            removed_from_wishlist,
            added_to_cart,
            removed_from_cart,
            cart_quantity_updated,
            total_sessions,
            days_since_last_activity,
            total_spent_usd
        FROM churn_user_features_mv
        WHERE client_id = :cid
        ORDER BY user_id
        LIMIT :lim
    """)
    res = await db.execute(q, {"cid": client_id, "lim": limit})
    rows = res.mappings().all()

    if not rows:
        return {"results": [], "count": 0, "note": "No feature rows for this client. Try refreshing the MV."}

    # Build payload exactly as model expects
    payload = []
    user_ids = []
    for r in rows:
        user_ids.append(r["user_id"])
        payload.append({
            "added_to_wishlist":         int(r["added_to_wishlist"] or 0),
            "removed_from_wishlist":     int(r["removed_from_wishlist"] or 0),
            "added_to_cart":             int(r["added_to_cart"] or 0),
            "removed_from_cart":         int(r["removed_from_cart"] or 0),
            "cart_quantity_updated":     int(r["cart_quantity_updated"] or 0),
            "total_sessions":            int(r["total_sessions"] or 0),
            "days_since_last_activity":  int(r["days_since_last_activity"] or 0),
            "total_spent_usd":           float(r["total_spent_usd"] or 0.0),
        })

    preds = await predict_churn(payload)

    out = []
    for i, r in enumerate(preds):
        p = r.get("probability")
        y = int(r.get("prediction", 0))
        score = p if p is not None else (1.0 if y == 1 else 0.0)
        out.append({
            "user_id": user_ids[i],
            "prediction": y,
            "probability": p,
            "threshold": threshold,
            "is_churn": score >= threshold,
            "label": "churn" if score >= threshold else "retain",
            "features": payload[i],  # helpful for debugging/FE display
        })

    # return {"results": out, "count": len(out)}
    return stamp_meta({"results": out , "count": len(out)})
   



@app.get("/model/names")
def model_names():
    try:
        feats = get_expected_features()
        return {"count": len(feats) if feats else 0, "features": feats}
    except Exception as e:
        return {"error": str(e)}


# --------------------------
# Model meta & health
# --------------------------
# @app.get("/model/meta")
# async def model_meta():
#     try:
#         feats = get_expected_features()
#         return {"status": "ok", "features": feats}
#     except Exception as e:
#         return {"status": "error", "error": str(e), "features": None}





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
UNITS = {
    "added_to_wishlist": "count",
    "removed_from_wishlist": "count",
    "added_to_cart": "count",
    "removed_from_cart": "count",
    "cart_quantity_updated": "count",
    "total_sessions": "count",
    "days_since_last_activity": "days",
    "total_spent_usd": "USD",
}



def _auto_label(k: str) -> str:
    # "avg_order_value" -> "Avg Order Value"
    s = k.replace("__", "_")
    parts = re.split(r"[_\-]+", s)
    return " ".join(p.capitalize() for p in parts if p)

def _auto_unit(k: str) -> str:
    # simple heuristics
    if k.endswith(("_usd", "_amount", "_revenue", "_value")):
        return "USD"
    if k.endswith(("_days", "_hours")):
        return "days" if k.endswith("_days") else "hours"
    if k.startswith(("pct_", "ratio_", "rate_")) or k.endswith(("_pct", "_ratio", "_rate")):
        return "%"
    return "count"



@app.get("/model/meta")
async def model_meta():
    feats = get_expected_features() or list(FRIENDLY.keys())
    return {
        "status": "ok",
        "features": feats,
        "friendly_names": {k: FRIENDLY.get(k, _auto_label(k)) for k in feats},
        "units": {k: UNITS.get(k, _auto_unit(k)) for k in feats},
        "model_version": MODEL_VERSION,
        "last_trained_at": LAST_TRAINED_AT,
    }



    feats = get_expected_features() or list(FRIENDLY.keys())
    return {
        "status": "ok",
        "features": feats,
        "friendly_names": {k: FRIENDLY.get(k, k) for k in feats},
        "units": {k: UNITS.get(k, "count") for k in feats},
        "model_version": MODEL_VERSION,
        "last_trained_at": LAST_TRAINED_AT,
    }


@app.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    db_ok = False
    model_ok = False
    db_error = None
    model_error = None

    try:
        result = await db.execute(text("SELECT 1"))
        _ = result.scalar_one_or_none()
        db_ok = True
    except Exception as e:
        db_error = str(e)

    try:
        _ = get_expected_features()
        model_ok = True
    except Exception as e:
        model_error = str(e)

    status_val = "ok" if (db_ok and model_ok) else "degraded" if (db_ok or model_ok) else "down"
    return {
        "status": status_val,
        "checks": {
            "db": {"ok": db_ok, "error": db_error},
            "model": {"ok": model_ok, "error": model_error},
        },
    }


app.include_router(routes_analytics.router, prefix="/analysis", tags=["Analysis"])

app.include_router(churn_page.router, prefix="/churn", tags=["Churn Prediction"])

app.include_router(routes_customer_profiles.router, prefix="/customers", tags=["Customer Profiles"])

app.include_router(routes_insights.router, prefix="/high-risk", tags=["High Risk Explorer"])

from app.routes import routes_reports
app.include_router(routes_reports.router, tags=["Weekly Reports"])

app.include_router(routes_emails.router, tags=["Email"])