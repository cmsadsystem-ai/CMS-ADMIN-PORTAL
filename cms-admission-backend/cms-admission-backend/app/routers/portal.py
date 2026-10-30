import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..security import create_staff_token, verify_password

router = APIRouter(prefix="/portal", tags=["portal"])


class LoginRequest(BaseModel):
    username: str
    password: str
    role: str | None = None


class UpdateAppRequest(BaseModel):
    updates: dict[str, Any]
    comment: str | None = None
    actor: str | None = None


@router.post("/auth/login")
def portal_login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(models.StaffUser).where(models.StaffUser.username == payload.username))
    if not user or not user.active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Invalid username or password")

    # Map backend enum role to frontend string if needed
    role_str = user.role.value
    if "officer" in role_str:
        client_role = "officer"
    elif "vice" in role_str:
        client_role = "vc"
    else:
        client_role = "admin"

    token = create_staff_token(user.id, user.role.value)
    return {
        "ok": True,
        "token": token,
        "role": client_role,
        "username": user.username,
        "fullName": user.full_name,
    }


@router.get("/applications")
def list_portal_applications(
    status: str | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(models.PortalApplication).order_by(models.PortalApplication.submitted_at.desc())
    if status:
        stmt = stmt.where(models.PortalApplication.status == status)

    records = db.scalars(stmt).all()
    results = []
    for r in records:
        try:
            data = json.loads(r.data_json)
        except Exception:
            data = {}
        # Ensure latest state from indexed columns is synced
        data["id"] = r.id
        data["status"] = r.status
        if r.confirmed_at:
            data["confirmedAt"] = r.confirmed_at.isoformat()
        if r.forwarded_at:
            data["forwardedAt"] = r.forwarded_at.isoformat()
        if r.submitted_at and not data.get("submittedAt"):
            data["submittedAt"] = r.submitted_at.isoformat()
        results.append(data)
    return results


import logging

logger = logging.getLogger(__name__)


def generate_yearly_application_id(db: Session, target_year: int | None = None) -> str:
    """Auto-generate a unique Application ID in format YYNNNN (e.g. 260001 for 2026, 270001 for 2027).
    - YY = current admission year (last 2 digits)
    - NNNN = sequential application number starting at 0001 each year
    - Automatically switches prefix when the year changes
    - Atomic row lock with_for_update() in MySQL/PostgreSQL prevents race conditions and collisions
    - Checks portal_applications to guarantee no duplicate IDs or overwrites
    """
    if target_year is None:
        target_year = datetime.now().year

    yy = target_year % 100
    prefix = f"{yy:02d}"

    try:
        models.ApplicationSequence.__table__.create(bind=db.get_bind(), checkfirst=True)
    except Exception:
        pass

    bind = db.get_bind()
    is_sqlite = bind and bind.dialect.name == "sqlite"

    stmt = select(models.ApplicationSequence).where(models.ApplicationSequence.year == target_year)
    if not is_sqlite:
        stmt = stmt.with_for_update()

    seq_record = db.scalar(stmt)

    if not seq_record:
        existing_ids = db.scalars(
            select(models.PortalApplication.id).where(models.PortalApplication.id.like(f"{prefix}%"))
        ).all()
        max_num = 0
        for aid in existing_ids:
            if len(aid) == 6 and aid.startswith(prefix) and aid[2:].isdigit():
                try:
                    val = int(aid[2:])
                    if val > max_num:
                        max_num = val
                except ValueError:
                    pass

        try:
            seq_record = models.ApplicationSequence(year=target_year, last_number=max_num)
            db.add(seq_record)
            db.flush()
        except Exception:
            db.rollback()
            stmt = select(models.ApplicationSequence).where(models.ApplicationSequence.year == target_year)
            if not is_sqlite:
                stmt = stmt.with_for_update()
            seq_record = db.scalar(stmt)

    while True:
        seq_record.last_number += 1
        candidate_id = f"{prefix}{seq_record.last_number:04d}"
        if not db.get(models.PortalApplication, candidate_id):
            db.flush()
            return candidate_id


def dispatch_status_email(
    to_email: str,
    student_name: str,
    application_id: str,
    status: str,
    course: str | None = None,
    application_details: dict[str, Any] | None = None,
    enquiring_email: str | None = None,
) -> tuple[bool, str]:
    """Sends status notification email (Enquiring or Confirmed) via SMTP.
    - Enquiring: Includes status, application ID, next steps, and link to complete the full admission form.
    - Confirm: Includes confirmation status, application ID, and next steps.
    """
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from ..config import Settings, settings

    # Read latest settings to dynamically capture updated credentials from .env
    active_settings = Settings()

    if not to_email:
        return False, "Recipient email is required"

    if not active_settings.SMTP_HOST:
        logger.warning(
            f"SMTP email service is not configured (SMTP_HOST is empty). Skipping email to {to_email} for status '{status}'."
        )
        return False, "SMTP_NOT_CONFIGURED"

    norm_status = (status or "Enquiring").strip()
    is_confirmed = norm_status.lower() in ["confirm", "confirmed"]
    student_display = student_name or "Student"
    course_display = course or "Selected Programme"
    frontend_url = active_settings.FRONTEND_BASE_URL.rstrip("/")
    form_link = f"{frontend_url}/register"

    if is_confirmed:
        subject = f"CMS College of Engineering - Admission Confirmed: {application_id}"
        body_html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9f8; color: #2d3748;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="background-color: #006747; color: #ffffff; padding: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">CMS COLLEGE OF ENGINEERING</h1>
      <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95;">Admissions Office — Seat Confirmation Notice</p>
    </div>
    <div style="padding: 28px 24px;">
      <p style="font-size: 16px; margin: 0 0 16px 0;">Dear <strong>{student_display}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
        Congratulations! Your admission at CMS College of Engineering has been officially <strong style="color: #006747;">CONFIRMED</strong>.
      </p>
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 5px solid #006747; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Application ID:</strong> <span style="font-size: 16px; font-weight: bold; color: #006747;">{application_id}</span></p>
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Confirmation Status:</strong> <span style="display: inline-block; background-color: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 13px;">Confirmed</span></p>
        <p style="margin: 0; font-size: 14px;"><strong>Allotted Course:</strong> <strong>{course_display}</strong></p>
      </div>
      <h3 style="color: #006747; font-size: 16px; margin: 24px 0 12px 0;">Next Steps for Enrollment:</h3>
      <ol style="margin: 0 0 24px 0; padding-left: 20px; font-size: 14px; line-height: 1.7; color: #374151;">
        <li style="margin-bottom: 8px;"><strong>Submit Original Certificates:</strong> Bring original 10th &amp; 12th / Diploma Marksheets, Transfer Certificate (TC), Conduct Certificate, and Community Certificate to the CMS Admissions Office.</li>
        <li style="margin-bottom: 8px;"><strong>Passport Photographs:</strong> Carry 4 recent passport-size color photographs and 1 copy of your Aadhaar card.</li>
        <li style="margin-bottom: 8px;"><strong>Fee Settlement:</strong> Complete payment of tuition / admission fee as scheduled and collect your official stamped payment receipt.</li>
        <li style="margin-bottom: 8px;"><strong>Orientation &amp; Class Schedule:</strong> Watch your email for the upcoming academic orientation schedule and hostel allotment instructions.</li>
      </ol>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0;">
        CMS College of Engineering Admissions Office<br/>
        Phone: +91 427 244 5566 | Email: {active_settings.SMTP_FROM}
      </p>
    </div>
  </div>
</body>
</html>"""
    else:
        subject = f"CMS College of Engineering - Admission Application Enquiring: {application_id}"
        body_html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9f8; color: #2d3748;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="background-color: #006747; color: #ffffff; padding: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">CMS COLLEGE OF ENGINEERING</h1>
      <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95;">Admissions Office — Application Enquiry Received</p>
    </div>
    <div style="padding: 28px 24px;">
      <p style="font-size: 16px; margin: 0 0 16px 0;">Dear <strong>{student_display}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
        Thank you for your interest in CMS College of Engineering. Your admission enquiry has been successfully registered.
      </p>
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 5px solid #006747; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Application ID:</strong> <span style="font-size: 16px; font-weight: bold; color: #006747;">{application_id}</span></p>
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Status:</strong> <span style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 13px;">Enquiring</span></p>
        <p style="margin: 0; font-size: 14px;"><strong>Selected Programme:</strong> <strong>{course_display}</strong></p>
      </div>
      <h3 style="color: #006747; font-size: 16px; margin: 24px 0 12px 0;">Next Steps:</h3>
      <ol style="margin: 0 0 24px 0; padding-left: 20px; font-size: 14px; line-height: 1.7; color: #374151;">
        <li style="margin-bottom: 8px;"><strong>Complete Full Admission Form:</strong> Access our portal to complete all personal, parent, and academic information required for admission.</li>
        <li style="margin-bottom: 8px;"><strong>Prepare Academic Records:</strong> Keep your 10th and 12th marksheets, Transfer Certificate, and Community Certificate ready for review.</li>
        <li style="margin-bottom: 8px;"><strong>Admission Counseling:</strong> Our admissions counseling team will contact you or you can visit our campus for seat reservation and fee guidance.</li>
      </ol>
      <div style="text-align: center; margin: 28px 0;">
        <a href="{form_link}" style="background-color: #006747; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(0,103,71,0.25);">Complete Full Admission Form &rarr;</a>
      </div>
      <p style="font-size: 13px; color: #6b7280; text-align: center; margin: 0 0 24px 0;">
        Direct link: <a href="{form_link}" style="color: #006747;">{form_link}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0;">
        CMS College of Engineering Admissions Office<br/>
        Phone: +91 427 244 5566 | Email: {enquiring_email or active_settings.SMTP_FROM}
      </p>
    </div>
  </div>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = active_settings.SMTP_FROM
    msg["To"] = to_email
    if not is_confirmed and enquiring_email:
        msg["Cc"] = enquiring_email

    msg.attach(MIMEText(body_html, "html"))

    try:
        if active_settings.SMTP_TLS:
            with smtplib.SMTP(active_settings.SMTP_HOST, active_settings.SMTP_PORT, timeout=10) as server:
                server.starttls()
                if active_settings.SMTP_USER and active_settings.SMTP_PASSWORD:
                    server.login(active_settings.SMTP_USER, active_settings.SMTP_PASSWORD)
                recipients = [to_email]
                if not is_confirmed and enquiring_email:
                    recipients.append(enquiring_email)
                server.sendmail(active_settings.SMTP_FROM, recipients, msg.as_string())
        else:
            with smtplib.SMTP(active_settings.SMTP_HOST, active_settings.SMTP_PORT, timeout=10) as server:
                if active_settings.SMTP_USER and active_settings.SMTP_PASSWORD:
                    server.login(active_settings.SMTP_USER, active_settings.SMTP_PASSWORD)
                recipients = [to_email]
                if not is_confirmed and enquiring_email:
                    recipients.append(enquiring_email)
                server.sendmail(active_settings.SMTP_FROM, recipients, msg.as_string())
        return True, f"Email delivered to {to_email}"
    except Exception as e:
        logger.error(f"Failed to send email to {to_email} via SMTP: {e}")
        return False, str(e)


@router.post("/applications")
def create_portal_application(
    payload: dict[str, Any],
    db: Session = Depends(get_db),
):
    app_id = payload.get("id")
    existing = db.get(models.PortalApplication, str(app_id)) if app_id else None

    # Check if app_id is in official YYNNNN format (6-digit numeric)
    is_valid_yearly_id = bool(app_id and len(str(app_id)) == 6 and str(app_id).isdigit())

    # Generate new atomic YYNNNN ID if:
    # 1. New application without existing record in DB, AND
    # 2. app_id is missing, starts with 'CMS-', or not in valid YYNNNN format
    if not existing and (not app_id or str(app_id).startswith("CMS-") or not is_valid_yearly_id):
        app_id = generate_yearly_application_id(db)
        payload["id"] = app_id
    elif not app_id:
        app_id = generate_yearly_application_id(db)
        payload["id"] = app_id
    else:
        app_id = str(app_id)
        payload["id"] = app_id

    if not payload.get("status"):
        payload["status"] = "Enquiring"
    if not payload.get("submittedAt"):
        payload["submittedAt"] = datetime.now(timezone.utc).isoformat()
    if not payload.get("updatedAt"):
        payload["updatedAt"] = datetime.now(timezone.utc).isoformat()

    student_name = payload.get("studentName")
    emis_id = payload.get("emisId")
    category = payload.get("admissionCategory") or payload.get("category")
    course_pref = payload.get("coursePreference")
    course_name = course_pref.get("firstPreference") if isinstance(course_pref, dict) else str(course_pref or "")

    if existing:
        existing.student_name = student_name
        existing.emis_id = emis_id
        existing.admission_category = category
        existing.course_name = course_name
        existing.status = payload.get("status", "Enquiring")
        existing.data_json = json.dumps(payload)
        record = existing
    else:
        record = models.PortalApplication(
            id=app_id,
            student_name=student_name,
            emis_id=emis_id,
            admission_category=category,
            course_name=course_name,
            status=payload.get("status", "Enquiring"),
            data_json=json.dumps(payload),
        )
        db.add(record)

    # 1. Database update is committed successfully first
    db.commit()
    db.refresh(record)

    # 2. Automatically email registered email on status Enquiring / Confirmed, preventing duplicates
    current_status = record.status or "Enquiring"
    last_emailed = payload.get("last_emailed_status")
    student_email = payload.get("email")

    if student_email and last_emailed != current_status and current_status in ["Enquiring", "Confirmed", "Confirm"]:
        dispatch_status_email(
            to_email=student_email,
            student_name=student_name or "Student",
            application_id=app_id,
            status=current_status,
            course=course_name,
            application_details=payload,
        )
        payload["last_emailed_status"] = current_status
        record.data_json = json.dumps(payload)
        db.commit()

    return payload


@router.put("/applications/{app_id}")
def update_portal_application(
    app_id: str,
    payload: UpdateAppRequest,
    db: Session = Depends(get_db),
):
    record = db.get(models.PortalApplication, app_id)
    if not record:
        raise HTTPException(404, "Application not found")

    try:
        data = json.loads(record.data_json)
    except Exception:
        data = {}

    old_status = record.status
    updates = payload.updates
    for k, v in updates.items():
        data[k] = v

    now_iso = datetime.now(timezone.utc).isoformat()
    data["updatedAt"] = now_iso

    new_status = updates.get("status", old_status)
    if "status" in updates:
        record.status = new_status
        if new_status in ["Confirmed", "Confirm"]:
            record.confirmed_at = datetime.now(timezone.utc)
            data["confirmedAt"] = now_iso
        elif new_status == "Sent to VC":
            record.forwarded_at = datetime.now(timezone.utc)
            data["forwardedAt"] = now_iso

    if payload.comment:
        history_entry = {
            "id": f"{app_id}-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            "applicationId": app_id,
            "note": payload.comment,
            "actor": payload.actor or "Admission Officer",
            "createdAt": now_iso,
        }
        history = data.get("correctionHistory", [])
        data["correctionHistory"] = [history_entry] + history

    record.data_json = json.dumps(data)
    # 1. Database update is committed successfully first
    db.commit()
    db.refresh(record)

    # 2. Automatically email student on status change, preventing duplicate emails
    last_emailed = data.get("last_emailed_status")
    student_email = data.get("email")

    if student_email and new_status in ["Enquiring", "Confirmed", "Confirm"]:
        if (new_status != old_status or last_emailed != new_status) and last_emailed != new_status:
            course_pref = data.get("coursePreference")
            course_name = course_pref.get("firstPreference") if isinstance(course_pref, dict) else str(course_pref or "")
            dispatch_status_email(
                to_email=student_email,
                student_name=data.get("studentName") or "Student",
                application_id=app_id,
                status=new_status,
                course=course_name,
                application_details=data,
            )
            data["last_emailed_status"] = new_status
            record.data_json = json.dumps(data)
            db.commit()

    return data


@router.delete("/applications/{app_id}")
def delete_portal_application(
    app_id: str,
    db: Session = Depends(get_db),
):
    record = db.get(models.PortalApplication, app_id)
    if not record:
        raise HTTPException(404, "Application not found")
    db.delete(record)
    db.commit()
    return {"ok": True, "id": app_id}


class EmailSendRequest(BaseModel):
    to: str
    studentName: str
    applicationId: str
    status: str
    course: str | None = None
    enquiringEmail: str | None = None
    applicationDetails: dict[str, Any] | None = None


@router.post("/email/send")
def send_portal_email(payload: EmailSendRequest):
    from ..config import Settings, settings

    active_settings = Settings()
    if not active_settings.SMTP_HOST:
        raise HTTPException(503, "SMTP email service is not configured on the server")

    ok, msg = dispatch_status_email(
        to_email=payload.to,
        student_name=payload.studentName,
        application_id=payload.applicationId,
        status=payload.status,
        course=payload.course,
        enquiring_email=payload.enquiringEmail,
        application_details=payload.applicationDetails,
    )
    if not ok:
        raise HTTPException(502, f"Failed to send email via SMTP: {msg}")
    return {"ok": True, "message": f"Email delivered to {payload.to}"}



@router.get("/settings/{key}")
def get_portal_setting(key: str, db: Session = Depends(get_db)):
    setting = db.get(models.PortalSetting, key)
    if not setting:
        return {"key": key, "value": None}
    try:
        val = json.loads(setting.value_json)
    except Exception:
        val = setting.value_json
    return {"key": key, "value": val}


@router.put("/settings/{key}")
def save_portal_setting(key: str, payload: dict[str, Any], db: Session = Depends(get_db)):
    val_str = json.dumps(payload.get("value"))
    setting = db.get(models.PortalSetting, key)
    if setting:
        setting.value_json = val_str
    else:
        setting = models.PortalSetting(key=key, value_json=val_str)
        db.add(setting)
    db.commit()
    return {"key": key, "ok": True}
