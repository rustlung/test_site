from typing import Optional, Union, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, OperationalError

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.models import LeadBehaviorCRUD

router = APIRouter(prefix="/behavior", tags=["behavior"])


# --- Schemas ---

class BehaviorTrackSchema(BaseModel):
    session_id: str
    time_on_page: int = 0
    clicks: Optional[Union[List, dict]] = None
    hovers: Optional[Union[List, dict]] = None
    return_count: int = 0


class BehaviorResponse(BaseModel):
    id: int
    lead_id: Optional[int] = None
    session_id: Optional[str] = None
    time_on_page: int
    clicks: Optional[Union[List, dict]] = None
    hovers: Optional[Union[List, dict]] = None
    return_count: int
    raw_data: Optional[Union[List, dict]] = None

    class Config:
        from_attributes = True


# --- Endpoints ---

@router.post("/", response_model=BehaviorResponse)
def track_behavior(data: BehaviorTrackSchema, db: Session = Depends(get_db)):
    """Записать/обновить поведение по сессии (клики, движения мыши, время). Вызывается периодически с фронта."""
    try:
        behavior = LeadBehaviorCRUD.update_or_create_for_session(
            db,
            data.session_id,
            time_on_page=data.time_on_page,
            clicks=data.clicks,
            hovers=data.hovers,
            return_count=data.return_count,
        )
        return behavior
    except (IntegrityError, OperationalError) as e:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail=(
                "Поведение по сессии недоступно: нужна миграция БД. "
                "См. backend/migrations/001_lead_behavior_session_id.sql"
            ),
        ) from e
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/", response_model=List[BehaviorResponse])
def list_all_behavior(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """Список всех записей поведения (для админки)."""
    return LeadBehaviorCRUD.get_all(db)


@router.get("/{lead_id}", response_model=BehaviorResponse)
def get_behavior_by_lead(lead_id: int, db: Session = Depends(get_db)):
    """Поведение пользователя по id заявки."""
    behavior = LeadBehaviorCRUD.get_by_lead_id(db, lead_id)
    if not behavior:
        raise HTTPException(status_code=404, detail="Behavior not found for this lead")
    return behavior
