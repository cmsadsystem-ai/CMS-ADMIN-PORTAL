# CMS College – Digital Admission System (CMS DAS) – Backend

FastAPI + PostgreSQL backend for the kiosk admission system described in the
project documentation: admission type & course → personal/parent/accommodation
/academic forms → QR document upload from the student's phone → preview →
digital signatures → QR payment → seat confirmation → forwarded to the Vice
Chairman. Built to match the printed CMS admission form and fee-structure
sheet field-for-field.

## 1. Cloud database (free) – pick one
- **Neon** (neon.tech) – free Postgres, easiest to start with
- **Supabase** (supabase.com) – free Postgres + dashboard

Create a project and copy the connection string.

## 2. Local setup
```bash
python -m venv .venv
.venv\Scripts\activate          # Windows   (Linux/Mac: source .venv/bin/activate)
pip install -r requirements.txt

copy .env.example .env           # Windows   (Linux/Mac: cp .env.example .env)
```
Fill in `.env`:
- `DATABASE_URL` – your cloud Postgres string (empty = local SQLite file, fine for dev/testing only)
- `JWT_SECRET` – `python -c "import secrets;print(secrets.token_hex(32))"`
- `AADHAAR_ENC_KEY` – `python -c "from cryptography.fernet import Fernet;print(Fernet.generate_key().decode())"`
- `MOBILE_UPLOAD_BASE_URL` – the frontend page a *phone* opens when it scans the kiosk QR
  (must be reachable from a phone on the campus network — not `localhost`, in production)
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` – bootstrap login, auto-created on first run if no staff exist

## 3. Create the database tables
```bash
alembic upgrade head
```
This creates every table in your cloud DB. (The app would also auto-create them on
first boot as a convenience, but `alembic upgrade head` is the real, repeatable way —
use it for every environment, and `alembic revision --autogenerate -m "..."` whenever
you change `app/models.py`.)

## 4. Run
```bash
uvicorn app.main:app --reload
```
- Swagger docs: http://127.0.0.1:8000/docs
- On first boot the 9 programmes, 8 fee-structure rows and the bootstrap admin
  login are seeded automatically (`app/seed.py`).

## 5. How the API maps to the admission workflow

| Docx stage | Endpoint(s) |
|---|---|
| 1. Start screen / Register | `POST /kiosk/applications` → returns `session_token` (kiosk stores it, e.g. in memory/localStorage, to keep filling its own draft) |
| 2. Admission type & course | included in the start call above |
| 3. Personal information | `PUT /kiosk/applications/personal-info` |
| 4. Parent details | `PUT /kiosk/applications/parent-info` |
| 5. Accommodation | `PUT /kiosk/applications/accommodation` (city+district required for day scholars) |
| 6. Academic education | `PUT /kiosk/applications/academic-info` (cut-off auto-computed) |
| — submit | `POST /kiosk/applications/submit-form` |
| 7. QR document upload | `GET /uploads/qr` (kiosk, returns a QR PNG) → phone calls `POST /uploads/{token}/documents` per file, no login → kiosk polls `GET /uploads/kiosk/documents` → `POST /uploads/kiosk/confirm-documents` |
| 8. Preview & recheck | `GET /kiosk/applications/me` |
| 9. Signatures & enquiry | `POST /kiosk/applications/signatures`, `POST /kiosk/applications/signatures/confirm`, `PUT /kiosk/applications/enquiry-note` |
| 10. Payment & seat confirmation | `POST /kiosk/applications/payment/initiate`, `POST /kiosk/applications/payment/confirm` |
| Admission Officer / VC lists | `GET /staff/applications`, `/staff/applications/payment-pending`, `/staff/applications/seat-confirmed`, `POST /staff/applications/{id}/forward`, `GET /staff/applications/export/excel` |

Every kiosk endpoint except the very first one requires header
`X-Session-Token: <token from step 1>` — this is how one kiosk screen's
in-progress draft is kept separate from every other one, with no student
login. The phone never logs in either: the QR code itself *is* its
credential (a short-lived upload token scoped to one application).

The application's `status` only ever moves forward one stage at a time
(`app/workflow.py`) — mirrors "the kiosk does not allow a stage to be
skipped" in the docx.

## 6. Staff accounts & roles
- `admission_officer` – sees every applicant, Aadhaar (decrypted), forwards confirmed seats to the VC, exports Excel
- `vice_chairman` – only ever sees applications already forwarded; never sees raw Aadhaar
- `admin` – everything above, plus creating staff accounts, courses, and editing fees

```
POST /auth/login          {"username": "...", "password": "..."}   -> Bearer token
POST /auth/staff          (admin only) create an officer/VC account
```

## 7. Security notes (from the docx's "Data storage and security" section)
- Aadhaar numbers are encrypted at rest (Fernet/AES) and decrypted only for
  `admission_officer`/`admin` roles, in the one detail endpoint — never in list views.
- Staff passwords are bcrypt-hashed.
- Uploaded documents are validated by content-type and size (15 MB cap) and stored
  under `UPLOAD_DIR`, one subfolder per application — swap `app/storage.py` for an
  S3-backed version later without touching any router.
- OTP verification of the student's mobile number is marked "(proposed)" in the docx
  and is **not** wired to a real SMS provider here — `mobile_verified` exists on the
  model and is ready for that integration.

## 8. What's intentionally stubbed (needs the college's decision — docx section 13)
- **Payment gateway** – `POST /kiosk/applications/payment/confirm` is a manual-confirm
  endpoint shaped like a real gateway callback. Once a gateway is chosen, replace its
  body with a signature-verified webhook handler; nothing else changes.
- **Tuition/hostel/transport fees** – left `null` in `fee_structures` (blank on the
  printed sheet). Fill them via `PUT /fees/{community}` once fixed.
- **Cut-off formula** – `app/cutoff.py` uses the standard Anna-University formula
  (Maths + Physics/2 + Chemistry/2). Change that one function if the college specifies
  something else.
- **OTP SMS provider**, **physical document re-verification step**, and **hostel
  seat allotment** are explicitly out of scope per the docx and not implemented.

## 9. Frontend connect (React + Vite, as agreed)
```bash
npm create vite@latest admission-frontend -- --template react-ts
cd admission-frontend
npm i react-router-dom react-hook-form zod @hookform/resolvers @tanstack/react-query axios xlsx qrcode.react
```
`.env`:
```
VITE_API_URL=http://127.0.0.1:8000
```
`src/api/client.ts`:
```ts
import axios from "axios";
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });
```
Kiosk draft session (after `POST /kiosk/applications`), attach to every later call:
```ts
api.defaults.headers.common["X-Session-Token"] = sessionToken;
```
Showing the upload QR (the backend already renders the PNG, so `qrcode.react` is
only needed if you'd rather draw it client-side from `upload_url`):
```tsx
const { data } = useQuery({ queryKey: ["uploadQr"], queryFn: () => api.get("/uploads/qr").then(r => r.data) });
<img src={`data:image/png;base64,${data.qr_png_base64}`} />
```
Excel export (server-side, for the staff dashboard):
```ts
const res = await api.get("/staff/applications/export/excel", { responseType: "blob" });
// save `res.data` as applications.xlsx (e.g. with file-saver)
```

## 10. Open decisions for the Vice Chairman (copied from the docx, section 13)
1. Number and placement of kiosk screens.
2. Which payment gateway / bank account, and are partial payments allowed.
3. Do Management vs Counselling flows differ in any field or fee.
4. Is hostel allotment handled in this system, or just a request noted for the Admission Officer.
5. Who physically verifies original documents, and at which stage.
6. Confirm the cut-off formula.
7. Fallback process if the kiosk/network fails.
8. Who maintains the system and data after launch.
