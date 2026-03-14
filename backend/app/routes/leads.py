from datetime import datetime
from typing import Optional, List, Union

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Lead, LeadBehavior, LeadCRUD, LeadBehaviorCRUD

router = APIRouter(prefix="/leads", tags=["leads"])


# --- Schemas ---

class LeadSchema(BaseModel):
    first_name: str
    last_name: str
    patronymic: str
    business_info: str
    business_niche: str
    company_size: str
    task_volume: str
    role: str
    budget: str
    task_type: str
    interested_product: str
    deadline: str
    contact_method: str
    convenient_time: str
    contact_value: Optional[str] = None
    comment: Optional[str] = None


class LeadBehaviorSchema(BaseModel):
    time_on_page: int = 0
    clicks: Optional[Union[list, dict]] = None
    hovers: Optional[Union[list, dict]] = None
    return_count: int = 0
    raw_data: Optional[Union[list, dict]] = None


class LeadCreateSchema(BaseModel):
    lead: LeadSchema
    behavior: LeadBehaviorSchema


class LeadBehaviorResponse(BaseModel):
    id: int
    lead_id: int
    time_on_page: int
    clicks: Optional[Union[list, dict]] = None
    hovers: Optional[Union[list, dict]] = None
    return_count: int
    raw_data: Optional[Union[list, dict]] = None

    class Config:
        from_attributes = True


class LeadResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    patronymic: str
    business_info: str
    business_niche: str
    company_size: str
    task_volume: str
    role: str
    budget: str
    task_type: str
    interested_product: str
    deadline: str
    contact_method: str
    convenient_time: str
    contact_value: Optional[str] = None
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LeadWithBehaviorResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    patronymic: str
    business_info: str
    business_niche: str
    company_size: str
    task_volume: str
    role: str
    budget: str
    task_type: str
    interested_product: str
    deadline: str
    contact_method: str
    convenient_time: str
    contact_value: Optional[str] = None
    comment: Optional[str] = None
    created_at: datetime
    behavior: Optional[LeadBehaviorResponse] = None

    class Config:
        from_attributes = True


# --- Endpoints ---

@router.post("/", response_model=LeadWithBehaviorResponse)
def create_lead(data: LeadCreateSchema, db: Session = Depends(get_db)):
    """Создать заявку с данными Lead + LeadBehavior."""
    lead = LeadCRUD.create(db, **data.lead.model_dump())
    behavior = LeadBehaviorCRUD.create(
        db,
        lead_id=lead.id,
        **data.behavior.model_dump()
    )
    lead = LeadCRUD.get(db, lead.id)
    return lead


@router.get("/", response_model=List[LeadWithBehaviorResponse])
def list_leads(db: Session = Depends(get_db)):
    """Список всех заявок."""
    return LeadCRUD.get_all(db)


@router.get("/{id}", response_model=LeadWithBehaviorResponse)
def get_lead(id: int, db: Session = Depends(get_db)):
    """Получить одну заявку по id."""
    lead = LeadCRUD.get(db, id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead
