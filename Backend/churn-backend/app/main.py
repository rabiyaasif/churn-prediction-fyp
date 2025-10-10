# app/main.py
from sqlalchemy import select,text
from fastapi import FastAPI, HTTPException, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
import secrets
from typing import List
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from typing import Union
from fastapi import HTTPException, status
from app.models import Base
from app.db import engine
from app.models import Base
from fastapi import Body
from app.ml import predict_churn
from app import ml


from app import models, schemas

DATABASE_URL = "postgresql+asyncpg://postgres:123456@localhost:5432/churn_db"

engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

app = FastAPI()

@app.on_event("startup")
async def on_startup():
    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
     # preload ML model  //added
    ml.load_pipeline()

@app.get("/")
async def root():
    return {"message": "API is running"}

# Allow CORS for browser requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to ["https://your-frontend.com"] in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.options("/events/bulk")
async def preflight_events_bulk():
    return {}  # FastAPI + CORSMiddleware will handle headers automatically

async def get_db():
    async with async_session() as session:
        yield session

async def verify_api_key(x_api_key: str = Header(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Client).where(models.Client.api_key == x_api_key)
    )
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=401, detail="Invalid or missing API Key")
    return client


# CLIENTS

@app.post("/clients/", response_model=schemas.ClientOut)
async def create_client(client: schemas.ClientCreate, db: AsyncSession = Depends(get_db)):
    api_key = secrets.token_hex(32)  # 64 hex characters, very secure
    new_client = models.Client(
        name=client.name,
        email=client.email,
        domain=client.domain,
        api_key=api_key,
        password=client.password,
        url=client.url

    )
    db.add(new_client)
    await db.commit()
    await db.refresh(new_client)
    return new_client


@app.post("/clients/login")
async def login_client(
    login_data: schemas.ClientLogin,  # you'll create this schema
    db: AsyncSession = Depends(get_db)
):
    # Query the client by email
    result = await db.execute(
        select(models.Client).where(models.Client.email == login_data.email)
    )
    client = result.scalars().first()

    # Check if client exists
    if not client:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Check password (plaintext check; hash check is better)
    if client.password != login_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

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

# BEST SELLING PRODUCTS
# @app.get("/api/best-selling", response_model=List[schemas.ProductTopSelling])
# async def get_best_selling(
#     db: AsyncSession = Depends(get_db),
#     client: models.Client = Depends(verify_api_key),
# ):
#     print('client_id is', client.client_id)
    
#     """
#     Returns top-selling products from the materialized view `top_products_mv`.
#     """
#     query = text("SELECT * FROM top_products_mv WHERE client_id = 3 ORDER BY total_quantity_sold DESC;")
#     # result = await db.execute(query, {"client_id": client.client_id})
#     result = await db.execute(query)

#     products = result.fetchall()
#     return [
#         schemas.ProductTopSelling(
#             product_name=row.product_name,
#             total_sales=row.total_sales,
#             total_quantity_sold=row.total_quantity_sold,
#             total_revenue=row.total_revenue,
#         )
#         for row in products
#     ]

@app.get("/api/best-selling")
async def best_selling(db: AsyncSession = Depends(get_db), client: models.Client = Depends(verify_api_key)):
    query = text("SELECT * FROM top_products_mv WHERE client_id = :client_id ORDER BY total_quantity_sold DESC LIMIT 10;")
    
    result = await db.execute(query, {"client_id": client.client_id})
    return result.mappings().all()


@app.get("/api/sales-over-time")
async def sales_over_time(db: AsyncSession = Depends(get_db), client: models.Client = Depends(verify_api_key)):
    query = text("SELECT * FROM sales_over_time WHERE client_id = :client_id;")

    result = await db.execute(query, {"client_id": client.client_id})
    return result.mappings().all()

@app.get("/api/neglected_items")
async def neglected_items(db: AsyncSession = Depends(get_db), client: models.Client = Depends(verify_api_key)):
    query = text("SELECT * FROM neglected_items WHERE client_id = :client_id;")

    result = await db.execute(query, {"client_id": client.client_id})
    return result.mappings().all()



# @router.get("/api/sales_funnel")
# async def sales_funnel(
#     from_date: date = Query(..., description="Start date in YYYY-MM-DD format"),
#     to_date: date = Query(..., description="End date in YYYY-MM-DD format"),
#     db: AsyncSession = Depends(get_db),
#     client: models.Client = Depends(verify_api_key)
# ):
#     """
#     Returns sales funnel counts: total sessions, add_to_cart sessions, and order sessions
#     for the given client within the date range.
#     """
#     query = text("""
#         WITH base AS (
#             SELECT DISTINCT session_id
#             FROM events
#             WHERE client_id = :client_id
#               AND "timestamp" BETWEEN :from_date AND :to_date
#         ),
#         atc AS (
#             SELECT DISTINCT session_id
#             FROM events
#             WHERE client_id = :client_id
#               AND event_type = 'add_to_cart'
#               AND "timestamp" BETWEEN :from_date AND :to_date
#         ),
#         orders AS (
#             SELECT DISTINCT COALESCE(session_id, email) AS sid
#             FROM events
#             WHERE client_id = :client_id
#               AND event_type = 'order_created'
#               AND "timestamp" BETWEEN :from_date AND :to_date
#         )
#         SELECT
#             (SELECT COUNT(*) FROM base)   AS sessions,
#             (SELECT COUNT(*) FROM atc)    AS add_to_cart_sessions,
#             (SELECT COUNT(*) FROM orders) AS order_sessions;
#     """)

#     result = await db.execute(query, {
#         "client_id": client.client_id,
#         "from_date": from_date,
#         "to_date": to_date
#     })

#     return result.mappings().first()



# USERS

@app.post("/users/", response_model=schemas.UserOut)
async def create_user(
    user: schemas.UserCreate,
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key)
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


# PRODUCTS

@app.post("/products/bulk", status_code=201)
async def bulk_insert_products(
    products: List[schemas.ProductCreate],
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key)
):
    product_objs = [
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
    db.add_all(product_objs)
    await db.commit()
    return {"inserted": len(product_objs)}


@app.put("/products/{product_id}", response_model=schemas.ProductOut)
async def update_product(
    product_id: str,
    product_update: schemas.ProductUpdate,
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key),
):
    product = await db.execute(
        select(models.Product).where(
            models.Product.product_id == product_id,
            models.Product.client_id == client.client_id
        )
    )
    product = product.scalar_one_or_none()
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
            models.Product.client_id == client.client_id
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.delete(product)
    await db.commit()
    return
# EVENTS

@app.post("/events/bulk", status_code=201)
async def bulk_insert_events(
    events: Union[schemas.EventCreate, List[schemas.EventCreate]],
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key)
):
    # Normalize to list
    if isinstance(events, schemas.EventCreate):
        events = [events]

    event_objs = []
    for ev in events:
        event_objs.append(models.Event(
            client_id=client.client_id,
            user_id=ev.user_id if ev.user_id else None,
            product_id=ev.product_id if ev.product_id else None,
            email=ev.email if ev.email else None,
            event_type=ev.event_type,
            session_id=ev.session_id,
            quantity=ev.quantity,
            price=ev.price,
            timestamp=ev.timestamp or datetime.utcnow(),
            extra_data=ev.extra_data
        ))
    db.add_all(event_objs)
    await db.commit()
    return {"inserted": len(event_objs)}

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


@app.post("/predict")
async def predict_endpoint(
    instances: list[dict] = Body(...),
    client: models.Client = Depends(verify_api_key)  # require API key
):
    """
    Run churn prediction on a list of user feature dicts.
    Features must match the names in feature_order.json
    """
    results = await predict_churn(instances)
    return {"results": results}


@app.post("/predict")
async def predict_endpoint(
    instances: list[dict] = Body(...),
    client: models.Client = Depends(verify_api_key)
):
    results = await predict_churn(instances)
    return {"results": results}

