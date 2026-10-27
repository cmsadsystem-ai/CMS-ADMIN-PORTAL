from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base
from .enums import (
    AccommodationType,
    AdmissionQuota,
    AdmissionType,
    ApplicationStatus,
    Community,
    DocumentType,
    Gender,
    Level,
    PaymentStatus,
    StaffRole,
)


class Course(Base):
    """The 8 programmes listed in the docx (AI&DS, CSE, CSE(CS), BME, EEE, ECE, MECH,
    AI&ML, plus M.E for PG) - seeded by app/seed.py, editable by admin."""

    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    level: Mapped[Level] = mapped_column(Enum(Level, native_enum=False))
    seats: Mapped[int] = mapped_column(Integer, default=60)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    applications: Mapped[list["Application"]] = relationship(back_populates="course")


class StaffUser(Base):
    """Admission Officer / Vice Chairman / Admin login. "Each can see only what
    their role needs" - enforced in routers via require_role()."""

    __tablename__ = "staff_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    role: Mapped[StaffRole] = mapped_column(Enum(StaffRole, native_enum=False))
    password_hash: Mapped[str] = mapped_column(String(255))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Application(Base):
    """One student's admission record. Fields map 1:1 to the printed CMS
    admission form plus the docx's parent/accommodation/academic pages."""

    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    form_no: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # printed "Form No" box

    # --- Step 2: admission type & course ---
    admission_type: Mapped[AdmissionType] = mapped_column(Enum(AdmissionType, native_enum=False))
    quota: Mapped[AdmissionQuota | None] = mapped_column(Enum(AdmissionQuota, native_enum=False), nullable=True)
    level: Mapped[Level] = mapped_column(Enum(Level, native_enum=False))
    first_graduate: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    course_id: Mapped[int | None] = mapped_column(ForeignKey("courses.id"), nullable=True)

    # --- Step 3: personal information ---
    full_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    dob: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[Gender | None] = mapped_column(Enum(Gender, native_enum=False), nullable=True)
    aadhaar_encrypted: Mapped[str | None] = mapped_column(String(255), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(5), nullable=True)
    community: Mapped[Community | None] = mapped_column(Enum(Community, native_enum=False), nullable=True)
    mobile_number: Mapped[str | None] = mapped_column(String(15), nullable=True)
    mobile_verified: Mapped[bool] = mapped_column(Boolean, default=False)  # OTP step is "proposed", not wired yet
    email: Mapped[str | None] = mapped_column(String(120), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # --- Step 4: parent / guardian details ---
    father_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    father_occupation: Mapped[str | None] = mapped_column(String(120), nullable=True)
    father_mobile: Mapped[str | None] = mapped_column(String(15), nullable=True)
    mother_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    mother_occupation: Mapped[str | None] = mapped_column(String(120), nullable=True)
    mother_mobile: Mapped[str | None] = mapped_column(String(15), nullable=True)
    has_guardian: Mapped[bool] = mapped_column(Boolean, default=False)
    guardian_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    guardian_occupation: Mapped[str | None] = mapped_column(String(120), nullable=True)
    guardian_mobile: Mapped[str | None] = mapped_column(String(15), nullable=True)

    # --- Step 5: accommodation ---
    accommodation: Mapped[AccommodationType | None] = mapped_column(Enum(AccommodationType, native_enum=False), nullable=True)
    boarding_route: Mapped[str | None] = mapped_column(String(120), nullable=True)  # day scholar transport route
    city: Mapped[str | None] = mapped_column(String(80), nullable=True)  # compulsory for day scholars
    district: Mapped[str | None] = mapped_column(String(80), nullable=True)  # compulsory for day scholars

    # --- Step 6: academic education ---
    school_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    school_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    marks_10th_total: Mapped[float | None] = mapped_column(Float, nullable=True)
    marks_maths: Mapped[float | None] = mapped_column(Float, nullable=True)
    marks_physics: Mapped[float | None] = mapped_column(Float, nullable=True)
    marks_chemistry: Mapped[float | None] = mapped_column(Float, nullable=True)
    cutoff_mark: Mapped[float | None] = mapped_column(Float, nullable=True)  # auto-computed, see app/cutoff.py

    # --- workflow ---
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus, native_enum=False), default=ApplicationStatus.STARTED
    )
    session_token: Mapped[str] = mapped_column(String(500))  # lets the kiosk resume its own draft only
    enquiry_note: Mapped[str | None] = mapped_column(Text, nullable=True)  # Admission Officer's notes before confirming
    forwarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    forwarded_by_id: Mapped[int | None] = mapped_column(ForeignKey("staff_users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    course: Mapped["Course | None"] = relationship(back_populates="applications")
    documents: Mapped[list["Document"]] = relationship(back_populates="application", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship(back_populates="application", cascade="all, delete-orphan")


class Document(Base):
    """One uploaded file (QR-uploaded certificate, or a kiosk-captured signature)."""

    __tablename__ = "documents"
    __table_args__ = (UniqueConstraint("application_id", "doc_type", name="uq_application_doctype"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"))
    doc_type: Mapped[DocumentType] = mapped_column(Enum(DocumentType, native_enum=False))
    file_path: Mapped[str] = mapped_column(String(500))
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    application: Mapped[Application] = relationship(back_populates="documents")


class Payment(Base):
    """QR payment attempts for one application. Gateway is 'finalized after
    approval' per the docx, so this starts as a manual-confirm stub - see
    app/routers/payments.py for exactly where a real gateway plugs in."""

    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"))
    amount: Mapped[float] = mapped_column(Float)
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus, native_enum=False), default=PaymentStatus.PENDING)
    reference: Mapped[str] = mapped_column(String(80), unique=True)
    gateway_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # raw webhook body, once a gateway exists
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    application: Mapped[Application] = relationship(back_populates="payments")


class FeeStructure(Base):
    """One row per community group, mirroring the printed fee-structure sheet.
    One-time fees are shared/seeded; tuition/hostel figures were blank on the
    sheet (management hadn't fixed them yet) and are nullable until Admin fills
    them in via PUT /fees."""

    __tablename__ = "fee_structures"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    community: Mapped[Community] = mapped_column(Enum(Community, native_enum=False), unique=True)

    # one-time fees (same for everyone - filled from the sheet)
    admission_fee: Mapped[float] = mapped_column(Float, default=5000)
    consortium_fee: Mapped[float] = mapped_column(Float, default=550)
    rra_amount: Mapped[float] = mapped_column(Float, default=2500)
    sports_fee: Mapped[float] = mapped_column(Float, default=625)
    group_insurance_fee: Mapped[float] = mapped_column(Float, default=100)
    syllabus_fee: Mapped[float] = mapped_column(Float, default=200)
    nss_fee: Mapped[float] = mapped_column(Float, default=25)
    lab_coat_fee: Mapped[float] = mapped_column(Float, default=500)
    id_card_fee: Mapped[float] = mapped_column(Float, default=100)
    hostel_transport_application_fee: Mapped[float] = mapped_column(Float, default=50)

    # left blank on the sheet - college to confirm (see docx section 13, point 2)
    book_exam_fee_per_semester: Mapped[float | None] = mapped_column(Float, nullable=True)
    tuition_fee_first_graduate: Mapped[float | None] = mapped_column(Float, nullable=True)
    tuition_fee_non_first_graduate: Mapped[float | None] = mapped_column(Float, nullable=True)
    hostel_fee: Mapped[float | None] = mapped_column(Float, nullable=True)
    transport_fee_per_year: Mapped[float | None] = mapped_column(Float, nullable=True)


class PortalApplication(Base):
    """Stores applications submitted directly through the CMS Admin & Admission portal.
    Guarantees 100% fidelity with the React frontend fields."""

    __tablename__ = "portal_applications"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    student_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    emis_id: Mapped[str | None] = mapped_column(String(60), nullable=True)
    admission_category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    course_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Enquiring")
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=func.now())
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    forwarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    data_json: Mapped[str] = mapped_column(Text)


class PortalSetting(Base):
    """Key-value JSON storage for portal settings (payment, background, etc.)."""

    __tablename__ = "portal_settings"

    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    value_json: Mapped[str] = mapped_column(Text)
