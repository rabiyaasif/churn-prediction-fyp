# app/deps.py
from fastapi import Header, HTTPException, Depends
from sqlalchemy import select
from app.db import AsyncSessionLocal
from app.models import Client
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

async def get_db_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

async def get_client_by_api_key(x_api_key: str = Header(None), db: AsyncSession = Depends(get_db_session)):
    if not x_api_key:
        raise HTTPException(status_code=401, detail="Missing X-API-Key header")
    q = await db.execute(select(Client).where(Client.api_key == x_api_key))
    client = q.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return client
