from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import LeadBehaviorCRUD

router = APIRouter(prefix="/behavior", tags=["behavior"])


# --- Schemas ---

class BehaviorResponse(BaseModel):
    id: int
    lead_id: int
    time_on_page: int
    clicks: Optional[dict] = None
    hovers: Optional[dict] = None
    return_count: int
    raw_data: Optional[dict] = None

    class Config:
        from_attributes = True


# --- Endpoints ---

@router.get("/{lead_id}", response_model=BehaviorResponse)
def get_behavior_by_lead(lead_id: int, db: Session = Depends(get_db)):
    """Поведение пользователя по id заявки."""
    behavior = LeadBehaviorCRUD.get_by_lead_id(db, lead_id)
    if not behavior:
        raise HTTPException(status_code=404, detail="Behavior not found for this lead")
    return behavior
