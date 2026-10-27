from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from .enums import (
    AccommodationType,
    AdmissionQuota,
    AdmissionType,
    Community,
    DocumentType,
    Gender,
    Level,
    PaymentStatus,
    StaffRole,
)


# ---------- auth ----------

class StaffLogin(BaseModel):
    username: str
    password: str


class StaffToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: StaffRole
    full_name: str


class StaffCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    full_name: str
    role: StaffRole
    password: str = Field(min_length=8)


class StaffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    full_name: str
    role: StaffRole
    active: bool


# ---------- courses ----------

class CourseCreate(BaseModel):
    code: str = Field(min_length=2, max_length=20)
    name: str = Field(min_length=2, max_length=120)
    level: Level
    seats: int = Field(default=60, ge=0)


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    level: Level
    seats: int
    active: bool


# ---------- kiosk: step 2, start an application ----------

class ApplicationStart(BaseModel):
    admission_type: AdmissionType
    quota: AdmissionQuota | None = None
    level: Level
    first_graduate: bool | None = None
    course_id: int


class ApplicationStartOut(BaseModel):
    id: int
    form_no: str
    session_token: str  # kiosk stores this (localStorage) to continue the draft


# ---------- kiosk: step 3, personal info ----------

class PersonalInfoIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    dob: date
    gender: Gender
    aadhaar_number: str = Field(min_length=12, max_length=12)
    blood_group: str | None = None
    community: Community
    mobile_number: str = Field(min_length=10, max_length=15)
    email: EmailStr | None = None
    address: str
    pincode: str = Field(min_length=6, max_length=6)

    @field_validator("aadhaar_number")
    @classmethod
    def aadhaar_digits_only(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("Aadhaar number must be exactly 12 digits")
        return v

    @field_validator("pincode")
    @classmethod
    def pincode_digits_only(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("Pincode must be 6 digits")
        return v


# ---------- kiosk: step 4, parent details ----------

class ParentInfoIn(BaseModel):
    father_name: str
    father_occupation: str
    father_mobile: str = Field(min_length=10, max_length=15)
    mother_name: str
    mother_occupation: str
    mother_mobile: str = Field(min_length=10, max_length=15)
    has_guardian: bool = False
    guardian_name: str | None = None
    guardian_occupation: str | None = None
    guardian_mobile: str | None = None


# ---------- kiosk: step 5, accommodation ----------

class AccommodationIn(BaseModel):
    accommodation: AccommodationType
    boarding_route: str | None = None
    city: str | None = None
    district: str | None = None

    @model_validator(mode="after")
    def require_city_district_for_day_scholar(self):
        # city/district compulsory for day scholars, per the docx
        if self.accommodation == AccommodationType.DAY_SCHOLAR and (not self.city or not self.district):
            raise ValueError("City and district are compulsory for day scholars")
        return self


# ---------- kiosk: step 6, academic education ----------

class AcademicInfoIn(BaseModel):
    school_name: str
    school_address: str
    marks_10th_total: float = Field(ge=0, le=500)
    marks_maths: float = Field(ge=0, le=100)
    marks_physics: float = Field(ge=0, le=100)
    marks_chemistry: float = Field(ge=0, le=100)


# ---------- documents ----------

class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    doc_type: DocumentType
    size_bytes: int
    uploaded_at: datetime


class UploadQrOut(BaseModel):
    upload_url: str
    upload_token: str
    qr_png_base64: str
    expires_in_minutes: int


# ---------- signatures (captured on the kiosk signature pad) ----------

class SignatureIn(BaseModel):
    signer: str = Field(pattern="^(student|parent)$")
    image_base64: str  # data:image/png;base64,....  or raw base64


# ---------- enquiry (Admission Officer note before confirming) ----------

class EnquiryNoteIn(BaseModel):
    note: str


# ---------- payment ----------

class PaymentInitiateOut(BaseModel):
    payment_id: int
    reference: str
    amount: float
    status: PaymentStatus


class PaymentConfirmIn(BaseModel):
    reference: str
    gateway_payload: str | None = None


# ---------- application read models ----------

class ApplicationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    form_no: str
    full_name: str | None
    admission_type: AdmissionType
    level: Level
    course_id: int | None
    status: str
    created_at: datetime


class ApplicationDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    form_no: str
    admission_type: AdmissionType
    quota: AdmissionQuota | None
    level: Level
    first_graduate: bool | None
    course_id: int | None

    full_name: str | None
    dob: date | None
    gender: Gender | None
    blood_group: str | None
    community: Community | None
    mobile_number: str | None
    mobile_verified: bool
    email: str | None
    address: str | None
    pincode: str | None

    father_name: str | None
    father_occupation: str | None
    father_mobile: str | None
    mother_name: str | None
    mother_occupation: str | None
    mother_mobile: str | None
    has_guardian: bool
    guardian_name: str | None
    guardian_occupation: str | None
    guardian_mobile: str | None

    accommodation: AccommodationType | None
    boarding_route: str | None
    city: str | None
    district: str | None

    school_name: str | None
    school_address: str | None
    marks_10th_total: float | None
    marks_maths: float | None
    marks_physics: float | None
    marks_chemistry: float | None
    cutoff_mark: float | None

    status: str
    enquiry_note: str | None
    forwarded_at: datetime | None
    created_at: datetime
    updated_at: datetime

    documents: list[DocumentOut] = []


class ApplicationStaffDetail(ApplicationDetail):
    """Same as ApplicationDetail but with Aadhaar visible (decrypted) -
    returned ONLY to admission_officer/admin, never to the kiosk or the VC list."""
    aadhaar_number: str | None = None


# ---------- fees ----------

class FeeStructureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    community: Community
    admission_fee: float
    consortium_fee: float
    rra_amount: float
    sports_fee: float
    group_insurance_fee: float
    syllabus_fee: float
    nss_fee: float
    lab_coat_fee: float
    id_card_fee: float
    hostel_transport_application_fee: float
    book_exam_fee_per_semester: float | None
    tuition_fee_first_graduate: float | None
    tuition_fee_non_first_graduate: float | None
    hostel_fee: float | None
    transport_fee_per_year: float | None


class FeeStructureUpdate(BaseModel):
    book_exam_fee_per_semester: float | None = None
    tuition_fee_first_graduate: float | None = None
    tuition_fee_non_first_graduate: float | None = None
    hostel_fee: float | None = None
    transport_fee_per_year: float | None = None
