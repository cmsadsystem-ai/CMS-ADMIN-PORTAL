from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import require_role
from ..enums import Community, StaffRole

router = APIRouter(prefix="/fees", tags=["fees"])


@router.get("", response_model=list[schemas.FeeStructureOut])
def list_fees(db: Session = Depends(get_db)):
    """Public: the kiosk shows this before payment so students know what they owe."""
    return db.scalars(select(models.FeeStructure)).all()


@router.put("/{community}", response_model=schemas.FeeStructureOut)
def update_fee(
    community: Community,
    payload: schemas.FeeStructureUpdate,
    db: Session = Depends(get_db),
    _admin: models.StaffUser = Depends(require_role(StaffRole.ADMIN)),
):
    row = db.scalar(select(models.FeeStructure).where(models.FeeStructure.community == community))
    if not row:
        raise HTTPException(404, "No fee row for this community")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row
