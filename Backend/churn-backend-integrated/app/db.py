# app/db.py
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/churn_db")

# Async engine & session
# engine = create_async_engine(DATABASE_URL, future=True, echo=False, pool_size=20, max_overflow=10)

engine = create_async_engine(
    DATABASE_URL,
    echo=True,              # show queries in console (optional)
    pool_pre_ping=True,     # auto-reconnect if DB drops connection
)


AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# app/db.py (append this)

from typing import AsyncGenerator

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# ✅ Dependency for DB sessions
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

