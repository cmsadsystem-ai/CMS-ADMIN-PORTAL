"""Step 7, QR document upload - two audiences sharing one token:
  - kiosk:  GET  /uploads/qr                 (needs X-Session-Token)
  - phone:  POST /uploads/{token}/documents  (needs only the QR token, no login)
"""

import base64
from io import BytesIO

import qrcode
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import settings
from ..database import get_db
from ..deps import get_application_by_session, get_application_by_upload_token
from ..enums import REQUIRED_UPLOAD_DOCUMENTS, ApplicationStatus, DocumentType
from ..security import create_upload_token
from ..storage import save_upload
from ..workflow import WorkflowError, advance_status, missing_documents

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.get("/qr", response_model=schemas.UploadQrOut)
def get_upload_qr(app: models.Application = Depends(get_application_by_session)):
    """Kiosk calls this on the Documentation page. The token is scoped to
    THIS application only and expires - see UPLOAD_TOKEN_EXPIRE_MINUTES."""
    token = create_upload_token(app.id)
    url = f"{settings.MOBILE_UPLOAD_BASE_URL}?token={token}"

    img = qrcode.make(url)
    buf = BytesIO()
    img.save(buf, format="PNG")
    png_b64 = base64.b64encode(buf.getvalue()).decode()

    return schemas.UploadQrOut(
        upload_url=url,
        upload_token=token,
        qr_png_base64=png_b64,
        expires_in_minutes=settings.UPLOAD_TOKEN_EXPIRE_MINUTES,
    )


@router.get("/{token}/status")
def upload_status(token: str, db: Session = Depends(get_db)):
    """Mobile page polls this (or the kiosk polls it) to show which of the
    required documents are still missing."""
    app = get_application_by_upload_token(token, db)
    uploaded = {d.doc_type for d in app.documents}
    return {
        "application_id": app.id,
        "uploaded": sorted(d.value for d in uploaded),
        "missing": sorted(d.value for d in REQUIRED_UPLOAD_DOCUMENTS if d not in uploaded),
    }


@router.post("/{token}/documents", response_model=schemas.DocumentOut, status_code=201)
async def upload_document(
    token: str,
    doc_type: DocumentType,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """The phone uploads one document at a time, picked by camera or file chooser."""
    app = get_application_by_upload_token(token, db)

    try:
        path, size = await save_upload(app.id, doc_type.value, file)
    except ValueError as e:
        raise HTTPException(400, str(e))

    existing = db.scalar(
        select(models.Document).where(models.Document.application_id == app.id, models.Document.doc_type == doc_type)
    )
    if existing:
        existing.file_path, existing.size_bytes = path, size
        doc = existing
    else:
        doc = models.Document(application_id=app.id, doc_type=doc_type, file_path=path, size_bytes=size)
        db.add(doc)

    db.commit()
    db.refresh(doc)
    return doc


@router.get("/kiosk/documents", response_model=list[schemas.DocumentOut])
def kiosk_view_documents(app: models.Application = Depends(get_application_by_session)):
    """Kiosk polls this to show uploads appearing live, per the docx ('Each
    upload appears on the kiosk screen within a few seconds')."""
    return app.documents


@router.post("/kiosk/confirm-documents", response_model=schemas.ApplicationDetail)
def confirm_documents(
    app: models.Application = Depends(get_application_by_session),
    db: Session = Depends(get_db),
):
    """Kiosk calls this when the student taps 'Continue to Preview'. Moves
    FORM_SUBMITTED -> DOCUMENTS_UPLOADED once every required document is in."""
    uploaded = {d.doc_type for d in app.documents}
    missing = missing_documents(uploaded)
    if missing:
        raise HTTPException(400, f"Still missing: {', '.join(d.value for d in missing)}")
    try:
        advance_status(app, ApplicationStatus.DOCUMENTS_UPLOADED)
    except WorkflowError as e:
        raise HTTPException(409, str(e))
    db.commit()
    db.refresh(app)
    return app
