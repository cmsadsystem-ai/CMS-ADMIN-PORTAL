# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
## Admission portal setup

Install dependencies with `npm install`, then start the development server with `npm run dev`. On Windows PowerShell systems where script execution is restricted, use `npm.cmd install` and `npm.cmd run dev`.

The landing page presents the college logo, background video, and a single Register button. The application then asks for admission category, degree/course, and FG (First Graduate), followed by the existing applicant form, the view-only fee structure, and full application preview. UG and PG courses are listed in `PROGRAMME_COURSES` in `src/utils/helpers.js`. No fee-structure file is currently included or configured; the administrator must upload the approved document before applicants can view it.

The registration form supports camera photos, gallery images, and PDF files for certificates, plus separate student and parent signature image uploads. Image previews can be rotated, removed, and replaced. These files, fee configuration, payment QR image and UPI ID, admission-office document checklist, and background video settings use frontend demo/browser storage; durable uploads, cross-device sharing, actual payment processing, and backend submission require backend integration. The administrator can configure the fee amount, one payment QR image, UPI ID, and fee-structure document in Officer Portal → Background settings. The Payment page shows the configured QR image or a demo-only placeholder and the UPI ID; no real payment is accepted or verified.

Application review follows three stages: submitted applications start as Enquiring; the admission officer reviews and confirms them into the Confirmed list while recording Original/Xerox document receipt ticks; the officer then sends a confirmed application to the VC list. Officer edits and checklist changes are saved with Save Changes or as part of either workflow action. The application preview also has staff name and staff category fields; Save stores these values with the local application draft.

The supplied or officer-selected campus video is shared between the student landing page, all registration steps, application preview, payment demo, and enquiry confirmation. It starts muted to satisfy browser autoplay rules; use the sound button at the lower-right to enable or mute audio.

To verify locally, run `npm.cmd run lint` and `npm.cmd run build`, then open the URL printed by `npm.cmd run dev`. Check Register → category → degree/course → FG → applicant form → Fees Structure → Preview Save/Print → Payment QR, then test Enquiring → Officer Confirm → Confirmed list → Send to VC → VC list, document receipt ticks, officer settings, and document/signature previews.
