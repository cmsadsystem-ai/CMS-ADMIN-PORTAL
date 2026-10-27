"""Password hashing, staff JWTs, short-lived QR/upload tokens, and Aadhaar encryption.

Kept in one module because every piece of it is "secret handling" and the
list of things to rotate in production (JWT_SECRET, AADHAAR_ENC_KEY) lives
in one place this way.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
from cryptography.fernet import Fernet, InvalidToken
from jose import JWTError, jwt

from .config import settings


# ---------- staff passwords ----------
# Using bcrypt directly (not via passlib) - passlib's bcrypt backend-detection
# code breaks under recent bcrypt releases (truncation check bug), and all we
# need here is hash/verify.

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode()[:72], password_hash.encode())
    except ValueError:
        return False


# ---------- staff login JWT ----------

def create_staff_token(user_id: int, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "role": role, "type": "staff", "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None


# ---------- QR / mobile document-upload session token ----------
# Deliberately NOT a login: a student never signs in on their phone. The
# token just proves "you are the person who scanned this kiosk's QR code
# for application #X", and it expires quickly.

def create_upload_token(application_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.UPLOAD_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(application_id), "type": "upload", "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_upload_token(token: str) -> int | None:
    data = decode_token(token)
    if not data or data.get("type") != "upload":
        return None
    try:
        return int(data["sub"])
    except (KeyError, ValueError, TypeError):
        return None


# ---------- kiosk draft-session token ----------
# Lets an unauthenticated kiosk screen keep filling in ITS OWN application
# across page 1-4 without a login, and stops one kiosk session reading or
# editing someone else's half-finished form by guessing an id.

def create_session_token(application_id: int) -> str:
    payload = {"sub": str(application_id), "type": "session"}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_session_token(token: str) -> int | None:
    data = decode_token(token)
    if not data or data.get("type") != "session":
        return None
    try:
        return int(data["sub"])
    except (KeyError, ValueError, TypeError):
        return None


# ---------- Aadhaar encryption at rest ----------
# "Sensitive data such as Aadhaar number is stored encrypted and shown only
# to authorised staff." -> symmetric encryption, decrypted only in the one
# staff endpoint that is allowed to reveal it.

def _fernet() -> Fernet:
    key = settings.AADHAAR_ENC_KEY.strip()
    if not key:
        raise RuntimeError(
            "AADHAAR_ENC_KEY is not set. Generate one with: "
            "python -c \"from cryptography.fernet import Fernet;print(Fernet.generate_key().decode())\""
        )
    return Fernet(key.encode())


def encrypt_aadhaar(aadhaar_number: str) -> str:
    return _fernet().encrypt(aadhaar_number.encode()).decode()


def decrypt_aadhaar(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        return "***decryption failed***"


def mask_aadhaar(aadhaar_number: str) -> str:
    """For list views: never show the full number, even decrypted."""
    digits = aadhaar_number[-4:] if len(aadhaar_number) >= 4 else aadhaar_number
    return f"XXXX-XXXX-{digits}"
