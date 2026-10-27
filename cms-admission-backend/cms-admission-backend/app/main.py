from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  (registers tables with Base.metadata)
from .config import settings
from .database import Base, SessionLocal, engine
from .routers import auth, courses, documents, fees, kiosk, payments, portal, signatures, staff, uploads
from .seed import run_all_seeds


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)  # creates tables in the cloud DB on first run
    db = SessionLocal()
    try:
        run_all_seeds(db)  # courses, fee rows, bootstrap admin login
    finally:
        db.close()
    yield


app = FastAPI(title="CMS College of Engineering - Digital Admission System API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(kiosk.router)
app.include_router(uploads.router)
app.include_router(signatures.router)
app.include_router(payments.router)
app.include_router(staff.router)
app.include_router(documents.router)
app.include_router(fees.router)
app.include_router(portal.router)


from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}


# ---- Serve Unified Frontend (Option B) ----
FRONTEND_DIST = Path(__file__).resolve().parents[3] / "cms-admission-Frontend" / "dist"

if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        if full_path:
            file_path = FRONTEND_DIST / full_path
            if file_path.is_file():
                return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
