from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Service, ServiceCRUD

router = APIRouter(prefix="/services", tags=["services"])


# --- Schemas ---

class ServiceCreateSchema(BaseModel):
    name: str
    description: Optional[str] = None
    budget_min: int
    budget_max: int
    is_active: bool = True


class ServiceUpdateSchema(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    is_active: Optional[bool] = None


class ServiceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    budget_min: int
    budget_max: int
    is_active: bool

    class Config:
        from_attributes = True


# --- Endpoints ---

@router.get("/", response_model=List[ServiceResponse])
def list_active_services(db: Session = Depends(get_db)):
    """Список активных услуг (публичный)."""
    return ServiceCRUD.get_active(db)


@router.post("/", response_model=ServiceResponse)
def create_service(data: ServiceCreateSchema, db: Session = Depends(get_db)):
    """Создать услугу (для админа)."""
    return ServiceCRUD.create(db, **data.model_dump())


@router.put("/{id}", response_model=ServiceResponse)
def update_service(id: int, data: ServiceUpdateSchema, db: Session = Depends(get_db)):
    """Обновить услугу."""
    service = ServiceCRUD.update(db, id, **data.model_dump(exclude_unset=True))
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@router.delete("/{id}")
def delete_service(id: int, db: Session = Depends(get_db)):
    """Удалить услугу."""
    deleted = ServiceCRUD.delete(db, id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"status": "deleted", "id": id}
