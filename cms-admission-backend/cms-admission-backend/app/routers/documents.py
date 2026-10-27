"""Lets authorised staff actually open an uploaded document/signature."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..deps import require_role
from ..enums import ApplicationStatus, StaffRole

router = APIRouter(prefix="/staff/documents", tags=["staff"])

_ANY_STAFF = require_role(StaffRole.ADMISSION_OFFICER, StaffRole.VICE_CHAIRMAN, StaffRole.ADMIN)


@router.get("/{document_id}/file")
def get_document_file(
    document_id: int,
    db: Session = Depends(get_db),
    user: models.StaffUser = Depends(_ANY_STAFF),
):
    doc = db.get(models.Document, document_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    if user.role == StaffRole.VICE_CHAIRMAN and doc.application.status != ApplicationStatus.FORWARDED_TO_VICE_CHAIRMAN:
        raise HTTPException(403, "Not yet forwarded to the Vice Chairman")
    return FileResponse(doc.file_path)
