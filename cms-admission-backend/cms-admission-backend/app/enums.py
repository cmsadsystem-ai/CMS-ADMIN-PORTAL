import enum


class AdmissionType(str, enum.Enum):
    MANAGEMENT = "management"
    COUNSELLING = "counselling"


class AdmissionQuota(str, enum.Enum):
    """GQ / MQ checkbox on the printed form."""
    GQ = "GQ"
    MQ = "MQ"


class Level(str, enum.Enum):
    UG = "UG"
    PG = "PG"


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class Community(str, enum.Enum):
    """Matches the fee-structure sheet's community groupings exactly."""
    OC = "OC"
    BC = "BC"
    BC_M = "BC(M)"
    MBC_DNC = "MBC & DNC"
    SC = "SC"
    SC_A = "SC(A)"
    ST = "ST"
    SCC = "SCC"


class AccommodationType(str, enum.Enum):
    HOSTEL = "hostel"
    DAY_SCHOLAR = "day_scholar"


class ApplicationStatus(str, enum.Enum):
    """Fixed order from the docx ("The kiosk does not allow a stage to be skipped")."""
    STARTED = "started"
    FORM_SUBMITTED = "form_submitted"
    DOCUMENTS_UPLOADED = "documents_uploaded"
    SIGNED = "signed"
    PAYMENT_COMPLETED = "payment_completed"
    SEAT_CONFIRMED = "seat_confirmed"
    FORWARDED_TO_VICE_CHAIRMAN = "forwarded_to_vice_chairman"


STATUS_ORDER = [
    ApplicationStatus.STARTED,
    ApplicationStatus.FORM_SUBMITTED,
    ApplicationStatus.DOCUMENTS_UPLOADED,
    ApplicationStatus.SIGNED,
    ApplicationStatus.PAYMENT_COMPLETED,
    ApplicationStatus.SEAT_CONFIRMED,
    ApplicationStatus.FORWARDED_TO_VICE_CHAIRMAN,
]


class DocumentType(str, enum.Enum):
    SSLC = "sslc_mark_sheet"
    HSC = "hsc_mark_sheet"
    TC = "transfer_certificate"
    CC = "community_certificate"
    NATIVITY_CERTIFICATE = "nativity_certificate"
    INCOME_CERTIFICATE = "income_certificate"
    AADHAAR_CARD = "aadhaar_card"
    PHOTO = "passport_photo"
    STUDENT_SIGNATURE = "student_signature"
    PARENT_SIGNATURE = "parent_signature"


# "Required documents" table in the docx - these must all be present before
# an application can move past DOCUMENTS_UPLOADED. Signatures are collected
# separately at the Signatures step, not counted here.
REQUIRED_UPLOAD_DOCUMENTS = [
    DocumentType.SSLC,
    DocumentType.HSC,
    DocumentType.TC,
    DocumentType.CC,
    DocumentType.NATIVITY_CERTIFICATE,
    DocumentType.INCOME_CERTIFICATE,
    DocumentType.AADHAAR_CARD,
    DocumentType.PHOTO,
]

REQUIRED_SIGNATURES = [DocumentType.STUDENT_SIGNATURE, DocumentType.PARENT_SIGNATURE]


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"


class StaffRole(str, enum.Enum):
    ADMISSION_OFFICER = "admission_officer"
    VICE_CHAIRMAN = "vice_chairman"
    ADMIN = "admin"
