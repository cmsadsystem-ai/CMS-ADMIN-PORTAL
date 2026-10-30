import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import socketio

from . import models  # noqa: F401  (registers tables with Base.metadata)
from .config import settings
from .database import Base, SessionLocal, engine
from .realtime import set_main_loop, sio
from .routers import auth, courses, documents, fees, kiosk, payments, portal, signatures, staff, uploads
from .seed import run_all_seeds


@asynccontextmanager
async def lifespan(app: FastAPI):
    set_main_loop(asyncio.get_running_loop())
    Base.metadata.create_all(bind=engine)  # creates tables in the cloud DB on first run
    db = SessionLocal()
    try:
        run_all_seeds(db)  # courses, fee rows, bootstrap admin login
    finally:
        db.close()
    yield


core_app = FastAPI(title="CMS College of Engineering - Digital Admission System API", version="0.1.0", lifespan=lifespan)

core_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

core_app.include_router(auth.router)
core_app.include_router(courses.router)
core_app.include_router(kiosk.router)
core_app.include_router(uploads.router)
core_app.include_router(signatures.router)
core_app.include_router(payments.router)
core_app.include_router(staff.router)
core_app.include_router(documents.router)
core_app.include_router(fees.router)
core_app.include_router(portal.router)


@core_app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}


# ---- Serve Unified Frontend (Option B) ----
FRONTEND_DIST = None
for candidate in [
    Path(__file__).resolve().parents[3] / "cms-admission-Frontend" / "dist",
    Path(__file__).resolve().parents[2] / "cms-admission-Frontend" / "dist",
    Path.cwd() / "cms-admission-Frontend" / "dist",
    Path.cwd() / "dist",
]:
    if candidate.exists() and (candidate / "index.html").exists():
        FRONTEND_DIST = candidate
        break

if FRONTEND_DIST:
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        core_app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @core_app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        if full_path:
            file_path = FRONTEND_DIST / full_path
            if file_path.is_file():
                return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")

# Wrap core_app with Socket.IO ASGIApp for unified single-port real-time WebSocket + REST
app = socketio.ASGIApp(sio, other_asgi_app=core_app, socketio_path="socket.io")
