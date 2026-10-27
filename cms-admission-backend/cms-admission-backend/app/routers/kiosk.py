"""Kiosk-facing endpoints: steps 2-6 of the docx's admission workflow
(admission type & course -> personal -> parent -> accommodation -> academic),
plus preview. No student login - see deps.get_application_by_session."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..cutoff import compute_cutoff
from ..database import get_db
from ..deps import get_application_by_session
from ..enums import ApplicationStatus
from ..security import create_session_token, encrypt_aadhaar
from ..workflow import WorkflowError, advance_status, missing_form_fields

router = APIRouter(prefix="/kiosk", tags=["kiosk"])


def _new_form_no(db: Session) -> str:
    # Simple incrementing form number, matches the printed form's "Form No" box.
    last = db.query(models.Application).order_by(models.Application.id.desc()).first()
    next_n = (last.id if last else 0) + 1001
    return str(next_n)


@router.post("/applications", response_model=schemas.ApplicationStartOut, status_code=201)
def start_application(payload: schemas.ApplicationStart, db: Session = Depends(get_db)):
    """Step 1/2: 'Register Now' -> choose Management/Counselling, UG/PG, course."""
    course = db.get(models.Course, payload.course_id)
    if not course or not course.active:
        raise HTTPException(400, "Invalid course_id")
    if course.level != payload.level:
        raise HTTPException(400, f"Course '{course.code}' is {course.level.value}, not {payload.level.value}")

    app = models.Application(
        form_no=_new_form_no(db),
        admission_type=payload.admission_type,
        quota=payload.quota,
        level=payload.level,
        first_graduate=payload.first_graduate,
        course_id=payload.course_id,
        session_token="",  # set below once we have the id
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    app.session_token = create_session_token(app.id)
    db.commit()

    return schemas.ApplicationStartOut(id=app.id, form_no=app.form_no, session_token=app.session_token)


@router.put("/applications/personal-info", response_model=schemas.ApplicationDetail)
def set_personal_info(
    payload: schemas.PersonalInfoIn,
    app: models.Application = Depends(get_application_by_session),
    db: Session = Depends(get_db),
):
    """Step 3: Personal information page."""
    data = payload.model_dump(exclude={"aadhaar_number"})
    for k, v in data.items():
        setattr(app, k, v)
    app.aadhaar_encrypted = encrypt_aadhaar(payload.aadhaar_number)
    db.commit()
    db.refresh(app)
    return app


@router.put("/applications/parent-info", response_model=schemas.ApplicationDetail)
def set_parent_info(
    payload: schemas.ParentInfoIn,
    app: models.Application = Depends(get_application_by_session),
    db: Session = Depends(get_db),
):
    """Step 4: Parent / guardian details page."""
    for k, v in payload.model_dump().items():
        setattr(app, k, v)
    db.commit()
    db.refresh(app)
    return app


@router.put("/applications/accommodation", response_model=schemas.ApplicationDetail)
def set_accommodation(
    payload: schemas.AccommodationIn,
    app: models.Application = Depends(get_application_by_session),
    db: Session = Depends(get_db),
):
    """Step 5: Hostel / day-scholar page. City & district required for day scholars."""
    for k, v in payload.model_dump().items():
        setattr(app, k, v)
    db.commit()
    db.refresh(app)
    return app


@router.put("/applications/academic-info", response_model=schemas.ApplicationDetail)
def set_academic_info(
    payload: schemas.AcademicInfoIn,
    app: models.Application = Depends(get_application_by_session),
    db: Session = Depends(get_db),
):
    """Step 6: Academic education page - cut-off is computed automatically."""
    for k, v in payload.model_dump().items():
        setattr(app, k, v)
    app.cutoff_mark = compute_cutoff(app.marks_maths, app.marks_physics, app.marks_chemistry)
    db.commit()
    db.refresh(app)
    return app


@router.post("/applications/submit-form", response_model=schemas.ApplicationDetail)
def submit_form(
    app: models.Application = Depends(get_application_by_session),
    db: Session = Depends(get_db),
):
    """Moves STARTED -> FORM_SUBMITTED once pages 1-4 are all filled in.
    Call this right before showing the Documentation (QR) page."""
    missing = missing_form_fields(app)
    if missing:
        raise HTTPException(400, f"Form incomplete, missing: {', '.join(missing)}")
    try:
        advance_status(app, ApplicationStatus.FORM_SUBMITTED)
    except WorkflowError as e:
        raise HTTPException(409, str(e))
    db.commit()
    db.refresh(app)
    return app


@router.get("/applications/me", response_model=schemas.ApplicationDetail)
def get_my_application(app: models.Application = Depends(get_application_by_session)):
    """Step 8: Preview & recheck page - shows everything entered + uploaded docs."""
    return app


@router.put("/applications/enquiry-note", response_model=schemas.ApplicationDetail)
def set_enquiry_note(
    payload: schemas.EnquiryNoteIn,
    app: models.Application = Depends(get_application_by_session),
    db: Session = Depends(get_db),
):
    """Step 9: student/parent raises a question for the Admission Officer
    before the seat is confirmed. (Officer's reply happens via the staff
    dashboard / phone - out of scope for this API version, same as the docx.)"""
    app.enquiry_note = payload.note
    db.commit()
    db.refresh(app)
    return app
