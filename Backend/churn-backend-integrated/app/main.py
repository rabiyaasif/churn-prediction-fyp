# app/main.py

import secrets
from datetime import datetime
from typing import List, Union

from fastapi import FastAPI, Body, Depends, Header, HTTPException, status
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
# Auth helper (kept for most routes; /predict is no-auth)
# --------------------------
async def verify_api_key(x_api_key: str = Header(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Client).where(models.Client.api_key == x_api_key))
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=401, detail="Invalid or missing API Key")
    return client


# --------------------------
# Clients
# --------------------------
@app.post("/clients/", response_model=schemas.ClientOut)
async def create_client(client: schemas.ClientCreate, db: AsyncSession = Depends(get_db)):
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
    result = await db.execute(select(models.Client).where(models.Client.email == login_data.email))
    client = result.scalars().first()
    if not client or client.password != login_data.password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return {"api_key": client.api_key}


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
# Analytics (require API key)
# --------------------------
@app.get("/api/best-selling")
async def best_selling(db: AsyncSession = Depends(get_db), client: models.Client = Depends(verify_api_key)):
    q = text("SELECT * FROM top_products_mv WHERE client_id = :client_id ORDER BY total_quantity_sold DESC LIMIT 10;")
    result = await db.execute(q, {"client_id": client.client_id})
    return result.mappings().all()


@app.get("/api/sales-over-time")
async def sales_over_time(db: AsyncSession = Depends(get_db), client: models.Client = Depends(verify_api_key)):
    q = text("SELECT * FROM sales_over_time WHERE client_id = :client_id;")
    result = await db.execute(q, {"client_id": client.client_id})
    return result.mappings().all()


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
    events: Union[schemas.EventCreate, List[schemas.EventCreate]],
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key),
):
    if isinstance(events, schemas.EventCreate):
        events = [events]

    objs = []
    for ev in events:
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
async def predict_endpoint(instances: List[ChurnFeatures] = Body(...), threshold: float = 0.5):
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
        return {"results": out}
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

    return {"results": out, "count": len(out)}

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
@app.get("/model/meta")
async def model_meta():
    try:
        feats = get_expected_features()
        return {"status": "ok", "features": feats}
    except Exception as e:
        return {"status": "error", "error": str(e), "features": None}


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
