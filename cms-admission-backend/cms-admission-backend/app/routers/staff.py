"""Admission Officer and Vice Chairman dashboard endpoints:
lists, search/filter, Aadhaar reveal, forwarding confirmed seats to the VC,
and Excel export - matches the docx's "Admission Officer and Vice Chairman
lists" section exactly."""

from datetime import date, datetime, timezone
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import require_role
from ..enums import ApplicationStatus, StaffRole
from ..security import decrypt_aadhaar
from ..workflow import WorkflowError, advance_status

router = APIRouter(prefix="/staff", tags=["staff"])

_OFFICER_OR_ADMIN = require_role(StaffRole.ADMISSION_OFFICER, StaffRole.ADMIN)
_VC_OR_ADMIN = require_role(StaffRole.VICE_CHAIRMAN, StaffRole.ADMIN)
_ANY_STAFF = require_role(StaffRole.ADMISSION_OFFICER, StaffRole.VICE_CHAIRMAN, StaffRole.ADMIN)


def _filtered_query(
    db: Session,
    status: ApplicationStatus | None,
    course_id: int | None,
    admission_type: str | None,
    search: str | None,
    date_from: date | None,
    date_to: date | None,
):
    stmt = select(models.Application).order_by(models.Application.id.desc())
    if status:
        stmt = stmt.where(models.Application.status == status)
    if course_id:
        stmt = stmt.where(models.Application.course_id == course_id)
    if admission_type:
        stmt = stmt.where(models.Application.admission_type == admission_type)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(models.Application.full_name.ilike(like))
    if date_from:
        stmt = stmt.where(models.Application.created_at >= date_from)
    if date_to:
        stmt = stmt.where(models.Application.created_at <= date_to)
    return stmt


@router.get("/applications", response_model=list[schemas.ApplicationSummary])
def list_applications(
    status: ApplicationStatus | None = None,
    course_id: int | None = None,
    admission_type: str | None = None,
    search: str | None = Query(None, description="Search by student name"),
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    user: models.StaffUser = Depends(_ANY_STAFF),
):
    """'All applicants' list. A Vice Chairman only ever sees forwarded/confirmed
    admissions - they are restricted to that status regardless of what they pass in."""
    if user.role == StaffRole.VICE_CHAIRMAN:
        status = ApplicationStatus.FORWARDED_TO_VICE_CHAIRMAN
    stmt = _filtered_query(db, status, course_id, admission_type, search, date_from, date_to)
    return db.scalars(stmt).all()


@router.get("/applications/payment-pending", response_model=list[schemas.ApplicationSummary])
def payment_pending(db: Session = Depends(get_db), _user: models.StaffUser = Depends(_OFFICER_OR_ADMIN)):
    """'Payment pending' list: finished the form but SIGNED, not yet paid."""
    stmt = select(models.Application).where(models.Application.status == ApplicationStatus.SIGNED).order_by(
        models.Application.id.desc()
    )
    return db.scalars(stmt).all()


@router.get("/applications/seat-confirmed", response_model=list[schemas.ApplicationSummary])
def seat_confirmed(db: Session = Depends(get_db), _user: models.StaffUser = Depends(_OFFICER_OR_ADMIN)):
    """'Seat confirmed' list - paid, ready for the Admission Officer to forward."""
    stmt = select(models.Application).where(models.Application.status == ApplicationStatus.SEAT_CONFIRMED).order_by(
        models.Application.id.desc()
    )
    return db.scalars(stmt).all()


@router.get("/applications/{app_id}", response_model=schemas.ApplicationStaffDetail)
def get_application(app_id: int, db: Session = Depends(get_db), user: models.StaffUser = Depends(_ANY_STAFF)):
    app = db.get(models.Application, app_id)
    if not app:
        raise HTTPException(404, "Application not found")
    if user.role == StaffRole.VICE_CHAIRMAN and app.status != ApplicationStatus.FORWARDED_TO_VICE_CHAIRMAN:
        raise HTTPException(403, "Not yet forwarded to the Vice Chairman")

    out = schemas.ApplicationStaffDetail.model_validate(app)
    # Aadhaar is only ever decrypted for the Admission Officer / Admin, matching
    # "shown only to authorised staff" in the docx's security section.
    if user.role in (StaffRole.ADMISSION_OFFICER, StaffRole.ADMIN) and app.aadhaar_encrypted:
        out.aadhaar_number = decrypt_aadhaar(app.aadhaar_encrypted)
    return out


@router.post("/applications/{app_id}/forward", response_model=schemas.ApplicationDetail)
def forward_to_vice_chairman(
    app_id: int,
    db: Session = Depends(get_db),
    user: models.StaffUser = Depends(_OFFICER_OR_ADMIN),
):
    """Admission Officer forwards one SEAT_CONFIRMED application to the VC's list."""
    app = db.get(models.Application, app_id)
    if not app:
        raise HTTPException(404, "Application not found")
    try:
        advance_status(app, ApplicationStatus.FORWARDED_TO_VICE_CHAIRMAN)
    except WorkflowError as e:
        raise HTTPException(409, str(e))
    app.forwarded_at = datetime.now(timezone.utc)
    app.forwarded_by_id = user.id
    db.commit()
    db.refresh(app)
    return app


@router.post("/applications/forward-batch", response_model=list[int])
def forward_batch(
    application_ids: list[int],
    db: Session = Depends(get_db),
    user: models.StaffUser = Depends(_OFFICER_OR_ADMIN),
):
    """Forward several confirmed seats to the Vice Chairman in one go.
    Returns the ids that were actually forwarded; others are left untouched."""
    forwarded = []
    for app_id in application_ids:
        app = db.get(models.Application, app_id)
        if not app or app.status != ApplicationStatus.SEAT_CONFIRMED:
            continue
        app.status = ApplicationStatus.FORWARDED_TO_VICE_CHAIRMAN
        app.forwarded_at = datetime.now(timezone.utc)
        app.forwarded_by_id = user.id
        forwarded.append(app_id)
    db.commit()
    return forwarded


@router.get("/applications/export/excel")
def export_excel(
    status: ApplicationStatus | None = None,
    course_id: int | None = None,
    db: Session = Depends(get_db),
    user: models.StaffUser = Depends(_ANY_STAFF),
):
    """'Lists can be... downloaded as a PDF or Excel file.' Excel is implemented
    here; the frontend's own xlsx lib can also export client-side from the JSON
    list endpoints above if that's simpler for the kiosk dashboard."""
    if user.role == StaffRole.VICE_CHAIRMAN:
        status = ApplicationStatus.FORWARDED_TO_VICE_CHAIRMAN
    rows = db.scalars(_filtered_query(db, status, course_id, None, None, None, None)).all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Applications"
    ws.append(["Form No", "Name", "Course", "Admission Type", "Status", "Cutoff", "Mobile", "Submitted On"])
    for a in rows:
        ws.append(
            [
                a.form_no,
                a.full_name or "",
                a.course.name if a.course else "",
                a.admission_type.value,
                a.status.value,
                a.cutoff_mark or "",
                a.mobile_number or "",
                a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else "",
            ]
        )

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=applications.xlsx"},
    )
