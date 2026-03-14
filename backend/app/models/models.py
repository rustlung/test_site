from __future__ import annotations

from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import String, Integer, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class Lead(Base):
    """
    Заявка клиента.

    CREATE TABLE lead (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR NOT NULL,
        last_name VARCHAR NOT NULL,
        patronymic VARCHAR NOT NULL,
        business_info VARCHAR NOT NULL,
        business_niche VARCHAR NOT NULL,
        company_size VARCHAR NOT NULL,
        task_volume VARCHAR NOT NULL,
        role VARCHAR NOT NULL,
        budget VARCHAR NOT NULL,
        task_type VARCHAR NOT NULL,
        interested_product VARCHAR NOT NULL,
        deadline VARCHAR NOT NULL,
        contact_method VARCHAR NOT NULL,
        convenient_time VARCHAR NOT NULL,
        comment VARCHAR,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    """
    __tablename__ = "lead"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    patronymic: Mapped[str] = mapped_column(String(255), nullable=False)
    business_info: Mapped[str] = mapped_column(Text, nullable=False)
    business_niche: Mapped[str] = mapped_column(String(255), nullable=False)
    company_size: Mapped[str] = mapped_column(String(255), nullable=False)
    task_volume: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(255), nullable=False)
    budget: Mapped[str] = mapped_column(String(255), nullable=False)
    task_type: Mapped[str] = mapped_column(String(255), nullable=False)
    interested_product: Mapped[str] = mapped_column(String(255), nullable=False)
    deadline: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_method: Mapped[str] = mapped_column(String(255), nullable=False)
    convenient_time: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_value: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    behavior: Mapped[Optional["LeadBehavior"]] = relationship("LeadBehavior", back_populates="lead", uselist=False)


class LeadBehavior(Base):
    """
    Поведение пользователя на странице (связь 1-к-1 с Lead).

    CREATE TABLE lead_behavior (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER UNIQUE NOT NULL REFERENCES lead(id) ON DELETE CASCADE,
        time_on_page INTEGER NOT NULL,
        clicks JSONB,
        hovers JSONB,
        return_count INTEGER NOT NULL DEFAULT 0,
        raw_data JSONB
    );
    """
    __tablename__ = "lead_behavior"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lead_id: Mapped[int] = mapped_column(Integer, ForeignKey("lead.id", ondelete="CASCADE"), unique=True, nullable=False)
    time_on_page: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    clicks: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    hovers: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    return_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    raw_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    lead: Mapped["Lead"] = relationship("Lead", back_populates="behavior")


class Service(Base):
    """
    Услуги (управляются админом).

    CREATE TABLE service (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        description VARCHAR,
        budget_min INTEGER NOT NULL,
        budget_max INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL
    );
    """
    __tablename__ = "service"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    budget_min: Mapped[int] = mapped_column(Integer, nullable=False)
    budget_max: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


# --- CRUD operations ---

class LeadCRUD:
    @staticmethod
    def create(db: "Session", **kwargs) -> Lead:
        obj = Lead(**kwargs)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    @staticmethod
    def get(db: "Session", id: int) -> Optional[Lead]:
        return db.query(Lead).filter(Lead.id == id).first()

    @staticmethod
    def get_all(db: "Session") -> List[Lead]:
        return db.query(Lead).all()

    @staticmethod
    def update(db: "Session", id: int, **kwargs) -> Optional[Lead]:
        obj = db.query(Lead).filter(Lead.id == id).first()
        if obj:
            for key, value in kwargs.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)
            db.commit()
            db.refresh(obj)
        return obj

    @staticmethod
    def delete(db: "Session", id: int) -> bool:
        obj = db.query(Lead).filter(Lead.id == id).first()
        if obj:
            db.delete(obj)
            db.commit()
            return True
        return False


class LeadBehaviorCRUD:
    @staticmethod
    def create(db: "Session", **kwargs) -> LeadBehavior:
        obj = LeadBehavior(**kwargs)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    @staticmethod
    def get(db: "Session", id: int) -> Optional[LeadBehavior]:
        return db.query(LeadBehavior).filter(LeadBehavior.id == id).first()

    @staticmethod
    def get_by_lead_id(db: "Session", lead_id: int) -> Optional[LeadBehavior]:
        return db.query(LeadBehavior).filter(LeadBehavior.lead_id == lead_id).first()

    @staticmethod
    def get_all(db: "Session") -> List[LeadBehavior]:
        return db.query(LeadBehavior).all()

    @staticmethod
    def update(db: "Session", id: int, **kwargs) -> Optional[LeadBehavior]:
        obj = db.query(LeadBehavior).filter(LeadBehavior.id == id).first()
        if obj:
            for key, value in kwargs.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)
            db.commit()
            db.refresh(obj)
        return obj

    @staticmethod
    def delete(db: "Session", id: int) -> bool:
        obj = db.query(LeadBehavior).filter(LeadBehavior.id == id).first()
        if obj:
            db.delete(obj)
            db.commit()
            return True
        return False


class ServiceCRUD:
    @staticmethod
    def create(db: "Session", **kwargs) -> Service:
        obj = Service(**kwargs)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    @staticmethod
    def get(db: "Session", id: int) -> Optional[Service]:
        return db.query(Service).filter(Service.id == id).first()

    @staticmethod
    def get_all(db: "Session") -> List[Service]:
        return db.query(Service).all()

    @staticmethod
    def get_active(db: "Session") -> List[Service]:
        return db.query(Service).filter(Service.is_active == True).all()

    @staticmethod
    def update(db: "Session", id: int, **kwargs) -> Optional[Service]:
        obj = db.query(Service).filter(Service.id == id).first()
        if obj:
            for key, value in kwargs.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)
            db.commit()
            db.refresh(obj)
        return obj

    @staticmethod
    def delete(db: "Session", id: int) -> bool:
        obj = db.query(Service).filter(Service.id == id).first()
        if obj:
            db.delete(obj)
            db.commit()
            return True
        return False
