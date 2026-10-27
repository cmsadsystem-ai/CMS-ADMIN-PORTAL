"""The fixed stage order from the docx: "The kiosk does not allow a stage to
be skipped." Every status-changing endpoint calls through here instead of
setting Application.status directly, so the rule lives in exactly one place.
"""

from .enums import STATUS_ORDER, REQUIRED_SIGNATURES, REQUIRED_UPLOAD_DOCUMENTS, ApplicationStatus, DocumentType
from .models import Application


class WorkflowError(ValueError):
    pass


REQUIRED_FORM_FIELDS = [
    "full_name", "dob", "gender", "aadhaar_encrypted", "community", "mobile_number", "address", "pincode",
    "father_name", "mother_name",
    "accommodation",
    "school_name", "marks_10th_total", "marks_maths", "marks_physics", "marks_chemistry",
]


def missing_form_fields(app: Application) -> list[str]:
    missing = [f for f in REQUIRED_FORM_FIELDS if getattr(app, f, None) in (None, "")]
    if app.accommodation and app.accommodation.value == "day_scholar":
        if not app.city:
            missing.append("city")
        if not app.district:
            missing.append("district")
    return missing


def missing_documents(uploaded_types: set[DocumentType]) -> list[DocumentType]:
    return [d for d in REQUIRED_UPLOAD_DOCUMENTS if d not in uploaded_types]


def missing_signatures(uploaded_types: set[DocumentType]) -> list[DocumentType]:
    return [d for d in REQUIRED_SIGNATURES if d not in uploaded_types]


def advance_status(app: Application, target: ApplicationStatus) -> None:
    """Move an application to `target`, but only if it is exactly the next
    stage after its current one (or the officer re-confirming the same
    stage). Raises WorkflowError with a human-readable reason otherwise."""
    current_idx = STATUS_ORDER.index(app.status)
    target_idx = STATUS_ORDER.index(target)

    if target_idx <= current_idx:
        raise WorkflowError(f"Application is already at or past '{target.value}'.")
    if target_idx != current_idx + 1:
        expected = STATUS_ORDER[current_idx + 1]
        raise WorkflowError(f"Cannot skip stages: next allowed status is '{expected.value}', not '{target.value}'.")

    app.status = target
