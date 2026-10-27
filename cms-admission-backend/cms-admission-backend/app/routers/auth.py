from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_staff, require_role
from ..enums import StaffRole
from ..security import create_staff_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=schemas.StaffToken)
def login(payload: schemas.StaffLogin, db: Session = Depends(get_db)):
    user = db.scalar(select(models.StaffUser).where(models.StaffUser.username == payload.username))
    if not user or not user.active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Invalid username or password")
    token = create_staff_token(user.id, user.role.value)
    return schemas.StaffToken(access_token=token, role=user.role, full_name=user.full_name)


@router.get("/me", response_model=schemas.StaffOut)
def me(user: models.StaffUser = Depends(get_current_staff)):
    return user


@router.post("/staff", response_model=schemas.StaffOut, status_code=201)
def create_staff(
    payload: schemas.StaffCreate,
    db: Session = Depends(get_db),
    _admin: models.StaffUser = Depends(require_role(StaffRole.ADMIN)),
):
    if db.scalar(select(models.StaffUser).where(models.StaffUser.username == payload.username)):
        raise HTTPException(409, "Username already exists")
    user = models.StaffUser(
        username=payload.username,
        full_name=payload.full_name,
        role=payload.role,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
