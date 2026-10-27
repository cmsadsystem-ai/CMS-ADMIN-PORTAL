"""Step 9: Signatures and enquiry. Student and parent sign on the kiosk's
own signature pad (sent here as a base64 PNG) - this is separate from the
phone/QR document uploads, matching the docx's 'digital signature' wording."""

import base64

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_application_by_session
from ..enums import ApplicationStatus, DocumentType
from ..storage import save_base64_image
from ..workflow import WorkflowError, advance_status, missing_signatures

router = APIRouter(prefix="/kiosk/applications/signatures", tags=["signatures"])

_SIGNER_TO_DOC = {"student": DocumentType.STUDENT_SIGNATURE, "parent": DocumentType.PARENT_SIGNATURE}


@router.post("", response_model=schemas.DocumentOut, status_code=201)
def submit_signature(
    payload: schemas.SignatureIn,
    app: models.Application = Depends(get_application_by_session),
    db: Session = Depends(get_db),
):
    raw = payload.image_base64.split(",", 1)[-1]  # tolerate a data: URL prefix
    try:
        image_bytes = base64.b64decode(raw)
    except Exception:
        raise HTTPException(400, "image_base64 is not valid base64")
    if not image_bytes:
        raise HTTPException(400, "Empty signature image")

    doc_type = _SIGNER_TO_DOC[payload.signer]
    path = save_base64_image(app.id, doc_type.value, image_bytes)

    existing = db.scalar(
        select(models.Document).where(models.Document.application_id == app.id, models.Document.doc_type == doc_type)
    )
    if existing:
        existing.file_path, existing.size_bytes = path, len(image_bytes)
        doc = existing
    else:
        doc = models.Document(application_id=app.id, doc_type=doc_type, file_path=path, size_bytes=len(image_bytes))
        db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.post("/confirm", response_model=schemas.ApplicationDetail)
def confirm_signatures(
    app: models.Application = Depends(get_application_by_session),
    db: Session = Depends(get_db),
):
    """Moves DOCUMENTS_UPLOADED -> SIGNED once both signatures are present."""
    uploaded = {d.doc_type for d in app.documents}
    missing = missing_signatures(uploaded)
    if missing:
        raise HTTPException(400, f"Still need: {', '.join(d.value for d in missing)}")
    try:
        advance_status(app, ApplicationStatus.SIGNED)
    except WorkflowError as e:
        raise HTTPException(409, str(e))
    db.commit()
    db.refresh(app)
    return app
