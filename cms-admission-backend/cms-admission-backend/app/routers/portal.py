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


@router.post("/applications")
def create_portal_application(
    payload: dict[str, Any],
    db: Session = Depends(get_db),
):
    app_id = str(payload.get("id") or f"CMS-{int(datetime.now(timezone.utc).timestamp() * 1000)}")
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

    existing = db.get(models.PortalApplication, app_id)
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

    updates = payload.updates
    for k, v in updates.items():
        data[k] = v

    now_iso = datetime.now(timezone.utc).isoformat()
    data["updatedAt"] = now_iso

    if "status" in updates:
        record.status = updates["status"]
        if updates["status"] == "Confirmed":
            record.confirmed_at = datetime.now(timezone.utc)
            data["confirmedAt"] = now_iso
        elif updates["status"] == "Sent to VC":
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
    db.commit()
    return data


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
