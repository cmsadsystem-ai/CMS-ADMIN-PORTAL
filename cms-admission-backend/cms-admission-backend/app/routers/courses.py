from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import require_role
from ..enums import StaffRole

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("", response_model=list[schemas.CourseOut])
def list_courses(level: str | None = None, db: Session = Depends(get_db)):
    stmt = select(models.Course).where(models.Course.active == True).order_by(models.Course.name)  # noqa: E712
    if level:
        stmt = stmt.where(models.Course.level == level)
    return db.scalars(stmt).all()


@router.post("", response_model=schemas.CourseOut, status_code=201)
def create_course(
    payload: schemas.CourseCreate,
    db: Session = Depends(get_db),
    _admin: models.StaffUser = Depends(require_role(StaffRole.ADMIN)),
):
    if db.scalar(select(models.Course).where(models.Course.code == payload.code)):
        raise HTTPException(409, "Course code already exists")
    course = models.Course(**payload.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course
