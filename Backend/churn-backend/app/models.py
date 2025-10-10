# app/models.py
import sqlalchemy as sa
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from sqlalchemy import Column, BigInteger, String, TIMESTAMP, ForeignKey, PrimaryKeyConstraint
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
Base = declarative_base()

class Client(Base):
    __tablename__ = "clients"
    client_id = sa.Column(sa.Integer, primary_key=True, autoincrement=True)
    name = sa.Column(sa.String, nullable=False)
    email = sa.Column(sa.String, nullable=True)
    domain = sa.Column(sa.String, nullable=True)
    api_key = sa.Column(sa.String, nullable=True)
    created_at = sa.Column(sa.TIMESTAMP(timezone=True), server_default=sa.func.now())
    password = sa.Column(sa.String, nullable=True)
    url = sa.Column(sa.String, nullable=True)


class User(Base):
    __tablename__ = "users"
    id = sa.Column(sa.Integer, primary_key=True, autoincrement=True)
    user_id = sa.Column(sa.String, nullable=False)
    client_id = sa.Column(sa.Integer, sa.ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    email = sa.Column(sa.String, nullable=True)
    name = sa.Column(sa.String, nullable=True)
    created_at = sa.Column(sa.TIMESTAMP(timezone=True), server_default=sa.func.now())


class Product(Base):
    __tablename__ = "products"
    id = sa.Column(sa.Integer, primary_key=True, autoincrement=True)
    product_id = sa.Column(sa.String, nullable=False)
    client_id = sa.Column(sa.Integer, sa.ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    name = sa.Column(sa.String, nullable=False)
    description = sa.Column(sa.Text, nullable=True)
    category = sa.Column(sa.String, nullable=True)
    price = sa.Column(sa.Numeric(10, 2), nullable=True)
    currency = sa.Column(sa.String, nullable=True)
    created_at = sa.Column(sa.TIMESTAMP(timezone=True), server_default=sa.func.now())


class Event(Base):
    __tablename__ = "events"
    event_id = sa.Column(sa.Integer, primary_key=True, autoincrement=True)
    client_id = sa.Column(sa.Integer, sa.ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    user_id = sa.Column(sa.String, nullable=True)
    product_id = sa.Column(sa.String, nullable=True)
    email = sa.Column(sa.String, nullable=True)
    event_type = sa.Column(sa.String, nullable=False)
    session_id = sa.Column(sa.String, nullable=True)
    quantity = sa.Column(sa.Integer, nullable=True)
    price = sa.Column(sa.Numeric(10, 2), nullable=True)
    timestamp = sa.Column(sa.TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    extra_data = sa.Column(JSONB, nullable=True)
