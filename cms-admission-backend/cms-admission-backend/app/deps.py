from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from . import models
from .database import get_db
from .enums import StaffRole
from .security import decode_session_token, decode_token, decode_upload_token


def _bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    return authorization.split(" ", 1)[1]


def get_current_staff(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> models.StaffUser:
    token = _bearer_token(authorization)
    data = decode_token(token)
    if not data or data.get("type") != "staff":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = db.get(models.StaffUser, int(data["sub"]))
    if not user or not user.active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account not found or disabled")
    return user


def require_role(*roles: StaffRole):
    def _check(user: models.StaffUser = Depends(get_current_staff)) -> models.StaffUser:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Your role cannot access this")
        return user

    return _check


def get_application_by_session(
    x_session_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> models.Application:
    """Kiosk auth: proves this caller owns this particular in-progress draft,
    without any login. Required on every kiosk step-2..6 / preview endpoint."""
    if not x_session_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing X-Session-Token header")
    app_id = decode_session_token(x_session_token)
    if app_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session token")
    app = db.get(models.Application, app_id)
    if not app:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    return app


def get_application_by_upload_token(token: str, db: Session = Depends(get_db)) -> models.Application:
    """Mobile-upload auth: the QR code encodes this token. No student login."""
    app_id = decode_upload_token(token)
    if app_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Upload link expired or invalid - go back to the kiosk and rescan")
    app = db.get(models.Application, app_id)
    if not app:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    return app
