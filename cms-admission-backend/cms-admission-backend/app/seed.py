"""Idempotent startup seed: the 8 programmes from the docx, one FeeStructure
row per community (from the printed fee sheet), and a bootstrap admin login
so the college can log in on day one and create real staff accounts."""

from sqlalchemy.orm import Session

from . import models
from .config import settings
from .enums import Community, Level, StaffRole
from .security import hash_password

COURSES: list[tuple[str, str, Level]] = [
    ("AIDS", "Artificial Intelligence & Data Science", Level.UG),       # B.Tech
    ("CSE", "Computer Science & Engineering", Level.UG),                # B.E
    ("CSE-CS", "CSE - Cyber Security", Level.UG),
    ("BME", "Bio-Medical Engineering", Level.UG),
    ("EEE", "Electrical & Electronics Engineering", Level.UG),
    ("ECE", "Electronics & Communication Engineering", Level.UG),
    ("MECH", "Mechanical Engineering", Level.UG),
    ("AIML", "Artificial Intelligence & Machine Learning", Level.UG),
    ("ME", "Master of Engineering", Level.PG),
]


def seed_courses(db: Session) -> None:
    existing = {c.code for c in db.query(models.Course).all()}
    for code, name, level in COURSES:
        if code not in existing:
            db.add(models.Course(code=code, name=name, level=level))
    db.commit()


def seed_fee_structures(db: Session) -> None:
    existing = {f.community for f in db.query(models.FeeStructure).all()}
    for community in Community:
        if community not in existing:
            db.add(models.FeeStructure(community=community))
    db.commit()


def seed_bootstrap_admin(db: Session) -> None:
    users = [
        (settings.ADMIN_USERNAME, "System Administrator", StaffRole.ADMIN, settings.ADMIN_PASSWORD),
        ("officer", "Admission Officer", StaffRole.ADMISSION_OFFICER, "CMSdemo1!"),
        ("vc", "Vice Chairman", StaffRole.VICE_CHAIRMAN, "CMSdemo2!"),
    ]
    for username, full_name, role, password in users:
        existing = db.query(models.StaffUser).filter(models.StaffUser.username == username).first()
        if not existing:
            db.add(
                models.StaffUser(
                    username=username,
                    full_name=full_name,
                    role=role,
                    password_hash=hash_password(password),
                )
            )
    db.commit()


def run_all_seeds(db: Session) -> None:
    seed_courses(db)
    seed_fee_structures(db)
    seed_bootstrap_admin(db)
