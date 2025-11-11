# app/schemas.py
from pydantic import BaseModel, Field, EmailStr
from typing import Any, Dict, Optional, List
from datetime import datetime
from uuid import UUID


class ClientCreate(BaseModel):
    name: str
    email: str
    domain: Optional[str] = None
    password: str
    url: str
    # api_key: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    domain: Optional[str] = None
    password: str
    url: str
    # api_key: Optional[str]

class ClientOut(BaseModel):
    client_id: int
    name: str
    email: Optional[str] = None
    domain: Optional[str] = None
    created_at: datetime
    password: str
    url: str
    api_key: str   # ✅ Add this line

    class Config:
        orm_mode = True


class ClientLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    # client_id: Optional[int]
    user_id: str
    email: Optional[EmailStr] = None
    name: Optional[str] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None

class UserOut(BaseModel):
    user_id: str
    # client_id: int
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True

class ProductCreate(BaseModel):
    # client_id: int
    product_id: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None

class ProductTopSelling(BaseModel):
    product_name: str
    total_sales: int
    total_quantity_sold: int
    total_revenue: float

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None

class ProductOut(BaseModel):
    product_id: str
    # client_id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True

class EventCreate(BaseModel):
    # client_id: int
    user_id: Optional[str] = None 
    product_id: Optional[str] = None
    email: Optional[str] = None
    event_type: str
    session_id: Optional[str] = None
    quantity: Optional[int] = None
    price: Optional[float] = None
    timestamp: Optional[datetime] = None
    extra_data: Optional[Dict[str, Any]] = None

class EventOut(BaseModel):
    event_id: int
    # client_id: int
    user_id: Optional[str] = None
    product_id: Optional[str] = None
    email: Optional[str] = None
    event_type: str
    session_id: Optional[str] = None
    quantity: Optional[int] = None
    price: Optional[float] = None
    timestamp: datetime
    extra_data: Optional[Dict[str, Any]] = None

    class Config:
        orm_mode = True
