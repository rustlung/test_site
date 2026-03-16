from datetime import datetime, date
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
    session_id: Optional[str] = None


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
    score: int = 0
    temperature: str = "cold"

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
    score: int = 0
    temperature: str = "cold"

    class Config:
        from_attributes = True


# --- Scoring logic ---


def _parse_budget_to_int(budget_str: str) -> int:
    digits = "".join(ch for ch in budget_str if ch.isdigit())
    if not digits:
        return 0
    try:
        return int(digits)
    except ValueError:
        return 0


def _parse_deadline(deadline_str: str) -> Optional[date]:
    # Ожидаем формат вида YYYY-MM-DD; при ошибке возвращаем None
    for fmt in ("%Y-%m-%d", "%d.%m.%Y"):
        try:
            return datetime.strptime(deadline_str.strip(), fmt).date()
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(deadline_str.strip()).date()
    except Exception:
        return None


def _calculate_lead_score(lead: Lead) -> tuple[int, str]:
    score = 0

    # role
    if lead.role == "Руководитель":
        score += 3

    # company_size
    if "200+" in lead.company_size:
        score += 3
    elif "51-200" in lead.company_size:
        score += 2
    elif "11-50" in lead.company_size:
        score += 1

    # deadline
    deadline_score = 1
    deadline_date = _parse_deadline(lead.deadline)
    if deadline_date:
        days = (deadline_date - date.today()).days
        if 0 <= days <= 30:
            deadline_score = 3
        elif 0 <= days <= 90:
            deadline_score = 2
    score += deadline_score

    # budget
    budget_value = _parse_budget_to_int(lead.budget)
    if budget_value > 5_000_000:
        score += 3
    elif budget_value > 1_000_000:
        score += 2
    else:
        score += 1

    # temperature
    if score >= 9:
        temperature = "hot"
    elif score >= 5:
        temperature = "warm"
    else:
        temperature = "cold"

    return score, temperature


def _attach_score(lead: Lead) -> dict:
    score, temperature = _calculate_lead_score(lead)
    base = LeadWithBehaviorResponse.model_validate(lead).model_dump()
    base["score"] = score
    base["temperature"] = temperature
    return base


# --- Endpoints ---

@router.post("/", response_model=LeadWithBehaviorResponse)
def create_lead(data: LeadCreateSchema, db: Session = Depends(get_db)):
    """Создать заявку с данными Lead + LeadBehavior. Если передан session_id, привязываем существующую запись поведения к заявке."""
    lead = LeadCRUD.create(db, **data.lead.model_dump())
    b = data.behavior.model_dump()
    if data.session_id:
        existing = LeadBehaviorCRUD.get_by_session_id(db, data.session_id)
        if existing:
            existing.lead_id = lead.id
            existing.time_on_page = b.get("time_on_page", 0)
            existing.clicks = b.get("clicks")
            existing.hovers = b.get("hovers")
            existing.return_count = b.get("return_count", 0)
            existing.raw_data = b.get("raw_data")
            db.commit()
            db.refresh(existing)
            lead = LeadCRUD.get(db, lead.id)
            return _attach_score(lead)
    behavior = LeadBehaviorCRUD.create(
        db,
        lead_id=lead.id,
        **b
    )
    lead = LeadCRUD.get(db, lead.id)
    return _attach_score(lead)


@router.get("/prioritized", response_model=List[LeadWithBehaviorResponse])
def list_prioritized_leads(db: Session = Depends(get_db)):
    """Список заявок, отсортированный по убыванию score."""
    leads = LeadCRUD.get_all(db)
    enriched = [_attach_score(lead) for lead in leads]
    enriched.sort(key=lambda x: x["score"], reverse=True)
    return enriched


@router.get("/", response_model=List[LeadWithBehaviorResponse])
def list_leads(db: Session = Depends(get_db)):
    """Список всех заявок."""
    leads = LeadCRUD.get_all(db)
    return [_attach_score(lead) for lead in leads]


@router.get("/{id}", response_model=LeadWithBehaviorResponse)
def get_lead(id: int, db: Session = Depends(get_db)):
    """Получить одну заявку по id."""
    lead = LeadCRUD.get(db, id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return _attach_score(lead)
