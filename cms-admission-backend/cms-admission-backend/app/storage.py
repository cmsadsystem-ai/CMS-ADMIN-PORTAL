"""Document storage.

Local disk for now (fine for a single on-campus kiosk server). Swap this
module for an S3/GCS-backed version later without touching any router -
everything else only calls save_file() / file_url().
"""

import uuid
from pathlib import Path

from fastapi import UploadFile

from .config import settings

MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB per document, generous for a phone photo/PDF
ALLOWED_CONTENT_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}


def _app_dir(application_id: int) -> Path:
    d = Path(settings.UPLOAD_DIR) / str(application_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


async def save_upload(application_id: int, doc_type: str, upload: UploadFile) -> tuple[str, int]:
    """Validate and persist an uploaded document. Returns (relative_path, size_bytes)."""
    if upload.content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f"Unsupported file type: {upload.content_type}. Use PDF, JPEG, PNG or WEBP.")

    ext = {"application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[upload.content_type]
    filename = f"{doc_type.lower()}_{uuid.uuid4().hex[:8]}{ext}"
    dest = _app_dir(application_id) / filename

    size = 0
    with open(dest, "wb") as out:
        while chunk := await upload.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                out.close()
                dest.unlink(missing_ok=True)
                raise ValueError("File too large (max 15 MB).")
            out.write(chunk)

    return str(dest), size


def save_base64_image(application_id: int, doc_type: str, data: bytes) -> str:
    """Used for on-screen signature pads (student/parent sign directly on the kiosk)."""
    filename = f"{doc_type.lower()}_{uuid.uuid4().hex[:8]}.png"
    dest = _app_dir(application_id) / filename
    dest.write_bytes(data)
    return str(dest)


def delete_file(path: str) -> None:
    Path(path).unlink(missing_ok=True)
