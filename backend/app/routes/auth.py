from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_jwt_token
from app.models.models import Admin, AdminCRUD


router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class HasAdminResponse(BaseModel):
    has_admin: bool


@router.get("/has-admin", response_model=HasAdminResponse)
def has_admin(db: Session = Depends(get_db)):
    """Проверить, есть ли хотя бы один администратор."""
    exists = db.query(Admin).first() is not None
    return HasAdminResponse(has_admin=exists)


@router.post("/register", response_model=TokenResponse)
def register_admin(data: RegisterRequest, db: Session = Depends(get_db)):
    """Создать первого администратора. Разрешено только если админов ещё нет."""
    existing: Optional[Admin] = db.query(Admin).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin already exists",
        )

    if AdminCRUD.get_by_username(db, data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    admin = AdminCRUD.create(
        db,
        username=data.username,
        hashed_password=hash_password(data.password),
    )
    token = create_jwt_token({"sub": admin.username})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login_admin(data: LoginRequest, db: Session = Depends(get_db)):
    """Логин администратора, выдача JWT токена."""
    admin = AdminCRUD.get_by_username(db, data.username)
    if not admin or not verify_password(data.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_jwt_token({"sub": admin.username})
    return TokenResponse(access_token=token)

