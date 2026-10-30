import { useState } from 'react';
import { ArrowLeft, CreditCard, Eye, Printer, Save, Send, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { calculateCutoff, formatDate } from '../utils/helpers';

function display(value) {
  return value === null || value === undefined || String(value).trim() === '' ? '—' : value;
}

function formatAadhaar(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 12);
  return digits ? digits.replace(/(\d{4})(?=\d)/g, '$1 ') : '—';
}

function PaperOption({ selected, label }) {
  return (
    <span className={`paper-option ${selected ? 'selected' : ''}`}>
      <span className="paper-checkbox" aria-hidden="true">
        {selected ? '✓' : ''}
      </span>
      <span>{label}</span>
    </span>
  );
}

const LEFT_COURSES = [
  { id: 'aids', label: 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE' },
  { id: 'cse', label: 'COMPUTER SCIENCE & ENGG' },
  { id: 'ece', label: 'ELECTRONICS AND COMMUNICATION ENGG' },
  { id: 'mech', label: 'MECHANICAL ENGG' },
];

const RIGHT_COURSES = [
  { id: 'biomed', label: 'BIO - MEDICAL ENGG' },
  { id: 'cyber', label: 'CSE- CYBER SECURITY' },
  { id: 'eee', label: 'ELECTRICAL AND ELECTRONICS ENGG' },
  { id: 'aiml', label: 'ARTIFICIAL INTELLIGENCE & MACHINE LEARNING', subtext: '*Awaiting Anna University approval' },
];

function isCourseChosen(courseItem, selectedCourse) {
  if (!selectedCourse) return false;
  const s = selectedCourse.toLowerCase().trim();
  const l = courseItem.label.toLowerCase();
  if (s === l) return true;
  if (courseItem.id === 'cyber' && s.includes('cyber')) return true;
  if (courseItem.id === 'aiml' && (s.includes('machine') || s.includes('aiml'))) return true;
  if (courseItem.id === 'aids' && (s.includes('data') || s.includes('aids'))) return true;
  if (courseItem.id === 'cse' && s.includes('computer') && !s.includes('cyber')) return true;
  if (courseItem.id === 'ece' && s.includes('communication')) return true;
  if (courseItem.id === 'eee' && s.includes('electrical')) return true;
  if (courseItem.id === 'biomed' && s.includes('bio')) return true;
  if (courseItem.id === 'mech' && s.includes('mech')) return true;
  return false;
}

const feeStructureRows = [
  { item: 'ADMISSION FEES (one time)', amount: '5000' },
  { item: 'CONSORTIUM FEES (one time)', amount: '550' },
  { item: 'RRA AMOUNT – ONE TIME (ANNA UNIVERSITY)', amount: '2500' },
  { item: 'SPORTS FEES– ONE TIME (ANNA UNIVERSITY) (Four Years)', amount: '625' },
  { item: 'GROUP INSURANCE – ONE TIME', amount: '100' },
  { item: 'SYLLABUS FEES ONE TIME (ANNA UNIVERSITY)', amount: '200' },
  { item: 'NSS FEES (ANNAUNIVERSITY)', amount: '25' },
  { item: 'LAB COAT', amount: '500' },
  { item: 'ID CARD', amount: '100' },
  { item: 'BOOK FEES & EXAM PAPER FEES (IN EVERY SEMESTER)', amount: '—' },
  { item: 'TUTION FEES – FIRST GRADUATE (OC/BC/BC(M)/MBC & DNC)', amount: 'Category based' },
  { item: 'TUITION FEES – NON-FIRST GRADUATE (OC/BC/BC(M)/MBC& DNC)', amount: 'Category based' },
  { item: 'TUITION FEES – SC/SC(A)/ST/SCC', amount: 'Category based' },
  { item: 'HOSTEL FEES – (OC/BC/BC(M)/MBC& DNC)', amount: 'Category based' },
  { item: 'HOSTEL FEES – SC/SC(A)/ST/SCC', amount: 'Category based' },
  { item: 'HOSTEL / TRANSPORT APPLICATION FORM', amount: '50' },
  { item: 'TRANSPORT FEES (PER YEAR)', amount: '—' },
];

export default function ApplicationPreviewPage() {
  const navigate = useNavigate();
  const { draft, saveDraft, submitApplication } = useAppContext();
  const [staffViewName, setStaffViewName] = useState(draft?.staffViewName || '');
  const [staffViewCategory, setStaffViewCategory] = useState(draft?.staffViewCategory || '');
  const [consultantName, setConsultantName] = useState(draft?.consultantName || '');
  const [organizationName, setOrganizationName] = useState(draft?.organizationName || '');
  const [selectedFilePreview, setSelectedFilePreview] = useState(null);
  const [staffErrors, setStaffErrors] = useState({});

  const cutoff = calculateCutoff({
    mathematics: draft?.mathematics,
    physics: draft?.physicsMarks,
    chemistry: draft?.chemistryMarks,
  });

  if (!draft || !draft.studentName) {
    return (
      <main className="page-shell preview-shell">
        <div className="content-panel empty-panel">
          <h2>No application found</h2>
          <p>Please complete the registration form before previewing the application.</p>
          <button type="button" className="primary-btn" onClick={() => navigate('/register')}>Back to form</button>
        </div>
      </main>
    );
  }

  const isGQ = draft.admissionCategory === 'GQ' || draft.admissionCategory === 'Counselling' || draft.admissionCategory === 'Government Quota';
  const isMQ = draft.admissionCategory === 'MQ' || draft.admissionCategory === 'Management' || draft.admissionCategory === 'Management Quota';
  const isFGYes = String(draft.firstGraduate).toLowerCase() === 'yes';
  const isFGNo = String(draft.firstGraduate).toLowerCase() === 'no';
  const isMale = String(draft.gender).toLowerCase() === 'male';
  const isFemale = String(draft.gender).toLowerCase() === 'female';
  const isOther = Boolean(draft.gender && !isMale && !isFemale);
  const isHostelYes = draft.accommodation === 'Hostel';
  const isHostelNo = draft.accommodation === 'Day Scholar' || String(draft.transportRequired).toLowerCase() === 'yes';

  const selectedCourse = draft.coursePreference?.firstPreference || '';
  const studentSig = (draft.studentSignature || draft.signature)?.dataUrl || null;
  const parentSig = draft.parentSignature?.dataUrl || null;
  const studentPhoto = draft.documents?.PassportSizePhotographs?.dataUrl || null;

  const docs = draft.documents || {};
  const docSSLC = docs.SSLC;
  const docHSC = docs.HSC;
  const docTC = docs.TC;
  const docCC = docs.CommunityCertificate || docs.CC;
  const docNativity = docs.NativityCertificate;
  const docIncome = docs.IncomeCertificate;
  const docAadhaar = docs.AadhaarCard;
  const docFG = docs.FirstGraduateCertificate || docs.FG;
  const docPhoto = docs.PassportSizePhotographs;

  const handleEnquiring = async () => {
    const sName = String(staffViewName || '').trim() || 'Admission Desk';
    const sCat = String(staffViewCategory || '').trim() || 'General';
    const application = await submitApplication({
      ...draft,
      status: 'Enquiring',
      staffViewName: sName,
      staffViewCategory: sCat,
      consultantName,
      organizationName,
      cutOffMarks: cutoff ?? '',
    });
    navigate(`/application-success?id=${encodeURIComponent(application?.id || '')}`);
  };

  const handleSaveDraft = () => {
    const sName = String(staffViewName || '').trim() || 'Admission Desk';
    const sCat = String(staffViewCategory || '').trim() || 'General';
    saveDraft({
      ...draft,
      staffViewName: sName,
      staffViewCategory: sCat,
      consultantName,
      organizationName,
      cutOffMarks: cutoff ?? '',
    });
    window.alert('Application draft saved successfully.');
  };

  const handleConfirmSeat = () => {
    const sName = String(staffViewName || '').trim() || 'Admission Desk';
    const sCat = String(staffViewCategory || '').trim() || 'General';
    saveDraft({
      ...draft,
      staffViewName: sName,
      staffViewCategory: sCat,
      consultantName,
      organizationName,
      cutOffMarks: cutoff ?? '',
    });
    navigate('/payment');
  };

  return (
    <main className="page-shell preview-shell" style={{ padding: '16px 10px' }}>
      <div className="cms-paper-wrapper">
        <article className="cms-paper-form">
          {/* Header matching authentic Reference Images 1 & 2 */}
          <header className="cms-paper-header">
            <div className="cms-branding-top">
              <div className="cms-branding-left">
                <img src="/cms-logo.png" alt="CMS College of Engineering Logo" className="cms-header-logo" />
                <div>
                  <h1 className="cms-college-title">CMS COLLEGE OF ENGINEERING</h1>
                  <p className="cms-college-motto">Nurturing Minds Through Innovative Education</p>
                  <p className="cms-college-status">(AUTONOMOUS STATUS AWARDED BY UGC, New Delhi)</p>
                  <p className="cms-college-address">CMS Nagar, Ernapuram post, Near Collectorate, Namakkal - 637 003</p>
                  <p className="cms-college-affiliation">(Approved by the AICTE New Delhi and affiliated to Anna University)</p>
                </div>
              </div>

              <div className="cms-header-right">
                <div className="cms-photo-boxes" title="Affix recent passport size photographs">
                  <div className="cms-photo-box">
                    {studentPhoto ? <img src={studentPhoto} alt="Student" /> : <span>Affix Photo</span>}
                  </div>
                  <div className="cms-photo-box"><span>Affix Photo</span></div>
                  <div className="cms-photo-box"><span>Affix Photo</span></div>
                  <div className="cms-photo-box"><span>Affix Photo</span></div>
                </div>
                <div className="cms-excellence-badge">
                  20 YEARS OF<br />EDUCATIONAL EXCELLENCE
                </div>
              </div>
            </div>

            {/* Additional Fields: Editable Consultant Name and Organization Name below college address */}
            <div className="cms-consultant-strip">
              <div className="cms-consultant-field">
                <label htmlFor="preview-consultant">Consultant Name:</label>
                <input
                  id="preview-consultant"
                  type="text"
                  placeholder="Enter consultant name"
                  value={consultantName}
                  onChange={(e) => {
                    setConsultantName(e.target.value);
                    saveDraft({ ...draft, consultantName: e.target.value });
                  }}
                  className="cms-consultant-input"
                />
              </div>
              <div className="cms-consultant-field">
                <label htmlFor="preview-org">Organization Name:</label>
                <input
                  id="preview-org"
                  type="text"
                  placeholder="Enter organization name"
                  value={organizationName}
                  onChange={(e) => {
                    setOrganizationName(e.target.value);
                    saveDraft({ ...draft, organizationName: e.target.value });
                  }}
                  className="cms-consultant-input"
                />
              </div>
            </div>
          </header>

          {/* Form No, Admission Form Title & Date */}
          <div className="cms-form-title-bar">
            <span>Form No: <strong># {draft.formNumber || '1888'}</strong></span>
            <span className="cms-form-title">ADMISSION FORM</span>
            <span>Date: <strong>{formatDate(draft.applicationDate || new Date())}</strong></span>
          </div>

          {/* Personal & Academic Details Table matching Reference Image 2 (wa_img_1.jpeg) */}
          <table className="cms-paper-table">
            <tbody>
              <tr>
                <th style={{ width: '30%' }}>CATEGORY OF ADMISSION</th>
                <td style={{ width: '70%' }}>
                  <PaperOption selected={isGQ} label="GQ (Counselling)" />
                  <PaperOption selected={isMQ} label="MQ (Management)" />
                </td>
              </tr>
              <tr>
                <th>FIRST GRADUATE</th>
                <td>
                  <PaperOption selected={isFGYes} label="YES" />
                  <PaperOption selected={isFGNo} label="NO" />
                </td>
              </tr>
              <tr>
                <th>NAME OF THE STUDENT</th>
                <td style={{ fontWeight: 700, letterSpacing: '0.5px' }}>
                  {display(String(draft.studentName || '').toUpperCase())}
                </td>
              </tr>
              <tr>
                <th>FATHER'S NAME &amp; OCCUPATION</th>
                <td>
                  {display(draft.fatherName)} {draft.fatherOccupation ? `& ${draft.fatherOccupation}` : ''}
                </td>
              </tr>
              <tr>
                <th>MOTHER'S NAME &amp; OCCUPATION</th>
                <td>
                  {display(draft.motherName)} {draft.motherOccupation ? `& ${draft.motherOccupation}` : ''}
                </td>
              </tr>
              <tr>
                <th>DATE OF BIRTH</th>
                <td>{display(formatDate(draft.dateOfBirth))}</td>
              </tr>
              <tr>
                <th>GENDER</th>
                <td>
                  <PaperOption selected={isMale} label="MALE" />
                  <PaperOption selected={isFemale} label="FEMALE" />
                  {isOther ? <PaperOption selected={true} label={`OTHER (${draft.gender})`} /> : null}
                </td>
              </tr>
              <tr>
                <th>AADHAAR NUMBER</th>
                <td style={{ letterSpacing: '1px' }}>{formatAadhaar(draft.aadhaar)}</td>
              </tr>
              <tr>
                <th>STUDENT'S MOBILE NO</th>
                <td>{draft.studentMobile ? `+91 ${draft.studentMobile}` : '—'}</td>
              </tr>
              <tr>
                <th>FATHER'S &amp; MOTHER'S MOBILE NO</th>
                <td>
                  Father: <strong>{draft.fatherMobile || draft.parentMobile ? `+91 ${draft.fatherMobile || draft.parentMobile}` : '—'}</strong>
                  &nbsp;&nbsp;|&nbsp;&nbsp;
                  Mother: <strong>{draft.motherMobile ? `+91 ${draft.motherMobile}` : '—'}</strong>
                </td>
              </tr>
              <tr>
                <th>COMMUNITY</th>
                <td>
                  <strong>{display(draft.community)}</strong> {draft.category ? `(${draft.category})` : ''}
                </td>
              </tr>
              <tr>
                <th>BLOOD GROUP</th>
                <td>
                  <strong>{draft.bloodGroup === 'Others' && draft.bloodGroupOther ? `Others (${draft.bloodGroupOther})` : display(draft.bloodGroup)}</strong>
                </td>
              </tr>
              <tr>
                <th>HOSTEL ACCOMMODATION</th>
                <td>
                  <PaperOption selected={isHostelYes} label="YES" />
                  <PaperOption selected={isHostelNo} label="NO" />
                </td>
              </tr>
              <tr>
                <th>BOARDING PLACE – ROUTE</th>
                <td>
                  {draft.pickupPoint || draft.busRoute || (isHostelYes ? 'Hosteller (No Route)' : 'Day Scholar')}
                </td>
              </tr>
              <tr>
                <th>ADDRESS FOR COMMUNICATION</th>
                <td>
                  {[draft.communicationAddress, draft.district, draft.state, draft.pinCode ? `PIN: ${draft.pinCode}` : ''].filter(Boolean).join(', ') || '—'}
                </td>
              </tr>
              <tr>
                <th>NAME OF THE SCHOOL &amp; ADDRESS</th>
                <td>
                  {[draft.schoolName, draft.schoolAddress].filter(Boolean).join(', ') || '—'}
                  {draft.hscGroup ? <span style={{ display: 'block', fontSize: '0.74rem', color: '#475569', marginTop: '2px' }}>Group: {draft.hscGroup}</span> : null}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Details of Marks Obtained matching Reference Image 2 */}
          <div className="cms-section-header">DETAILS OF MARKS OBTAINED</div>
          <table className="cms-paper-table" style={{ textAlign: 'center', marginTop: '-1px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'center', width: '20%' }}>MATHS</th>
                <th style={{ textAlign: 'center', width: '25%' }}>PHYSICS (THEORY + PRACTICAL)</th>
                <th style={{ textAlign: 'center', width: '25%' }}>CHEMISTRY (THEORY + PRACTICAL)</th>
                <th style={{ textAlign: 'center', width: '15%' }}>CUT-OFF MARKS</th>
                <th style={{ textAlign: 'center', width: '15%' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700 }}>{display(draft.mathematics)}</td>
                <td style={{ fontWeight: 700 }}>{display(draft.physicsMarks)}</td>
                <td style={{ fontWeight: 700 }}>{display(draft.chemistryMarks)}</td>
                <td style={{ fontWeight: 700, color: '#006747' }}>{cutoff !== null ? cutoff.toFixed(2) : '—'}</td>
                <td style={{ fontWeight: 700 }}>{display(draft.hscMarks)}</td>
              </tr>
            </tbody>
          </table>

          {/* Courses (B.E/B.TECH) Preferred matching Reference Image 2 */}
          <div className="cms-section-header">COURSES (B.E/B.TECH) PREFERRED</div>
          <div className="cms-courses-grid">
            <div>
              {LEFT_COURSES.map((course) => {
                const chosen = isCourseChosen(course, selectedCourse);
                return (
                  <div key={course.id} className={`cms-course-item ${chosen ? 'selected' : ''}`}>
                    <span className="paper-checkbox" aria-hidden="true">{chosen ? '✓' : ''}</span>
                    <span>{course.label}</span>
                  </div>
                );
              })}
            </div>
            <div>
              {RIGHT_COURSES.map((course) => {
                const chosen = isCourseChosen(course, selectedCourse);
                return (
                  <div key={course.id} className={`cms-course-item ${chosen ? 'selected' : ''}`}>
                    <span className="paper-checkbox" aria-hidden="true">{chosen ? '✓' : ''}</span>
                    <div>
                      <span>{course.label}</span>
                      {course.subtext ? <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b' }}>{course.subtext}</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fees Structure matching Reference Image 3 (wa_img_2.jpeg) */}
          <div className="cms-section-header" style={{ marginTop: '8px' }}>FEES STRUCTURE</div>
          <table className="cms-fees-table">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ textAlign: 'left', width: '75%' }}>Particulars</th>
                <th style={{ textAlign: 'right', width: '25%' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {feeStructureRows.map((row) => (
                <tr key={row.item}>
                  <td>{row.item}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Digital Signatures for Student and Parent */}
          <div className="cms-signatures-row">
            <div className="cms-signature-block">
              {studentSig ? (
                <img src={studentSig} alt="Signature of the Student" className="cms-signature-img" />
              ) : (
                <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.72rem' }}>Digital signature recorded</span>
              )}
              <span className="cms-signature-label">SIGNATURE OF THE STUDENT</span>
            </div>
            <div className="cms-signature-block" style={{ textAlign: 'right', alignItems: 'flex-end' }}>
              {parentSig ? (
                <img src={parentSig} alt="Signature of the Parent" className="cms-signature-img" />
              ) : (
                <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.72rem' }}>Digital signature recorded</span>
              )}
              <span className="cms-signature-label">SIGNATURE OF THE PARENT</span>
            </div>
          </div>

          {/* FOR OFFICE USE ONLY — CERTIFICATES SUBMITTED Table matching Reference Image 3 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 4px', fontWeight: 800, fontSize: '0.76rem' }}>
            <span>FOR OFFICE USE ONLY</span>
            <span style={{ textDecoration: 'underline' }}>CERTIFICATES SUBMITTED</span>
            <span style={{ visibility: 'hidden' }}>OFFSET</span>
          </div>

          <table className="cms-office-table">
            <thead>
              <tr>
                <th style={{ width: '13%' }}>SUBMITTED TYPE</th>
                <th>SSLC</th>
                <th>HSC</th>
                <th>TC</th>
                <th>CC</th>
                <th>NATIVITY CERTIFICATE</th>
                <th>INCOME CERTIFICATE</th>
                <th>AADHAAR CARD</th>
                <th>F.G</th>
                <th>PHOTO Nos</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th style={{ textAlign: 'left' }}>ORIGINAL</th>
                <td>{docSSLC ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
                <td>{docHSC ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
                <td>{docTC ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
                <td>{docCC ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
                <td>{docNativity ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
                <td>{docIncome ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
                <td>{docAadhaar ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
                <td>{docFG ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
                <td>{docPhoto ? '4' : '—'}</td>
              </tr>
              <tr>
                <th style={{ textAlign: 'left' }}>XEROX</th>
                <td>{docSSLC ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
                <td>{docHSC ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
                <td>{docTC ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
                <td>{docCC ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
                <td>{docNativity ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
                <td>{docIncome ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
                <td>{docAadhaar ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
                <td>{docFG ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>

          {/* Interactive Document Preview Buttons in Screen Mode */}
          <div className="screen-only" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '6px 0 10px', fontSize: '0.74rem', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#475569' }}>Uploaded Certificates:</span>
            {Object.entries(docs).filter(([, file]) => file?.dataUrl).map(([key, file]) => (
              <button
                key={key}
                type="button"
                className="secondary-btn compact"
                style={{ padding: '2px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setSelectedFilePreview({ title: key, file })}
              >
                <Eye size={12} /> {key === 'CC' || key === 'CommunityCertificate' ? 'Community' : key.replace(/([A-Z])/g, ' $1').trim()}
              </button>
            ))}
            {!Object.values(docs).some((f) => f?.dataUrl) ? <span style={{ color: '#94a3b8' }}>None uploaded yet</span> : null}
          </div>

          {/* REFERENCE Box matching Reference Image 3 */}
          <div className="cms-reference-box">
            <div className="cms-reference-title">REFERENCE</div>
            <div className="cms-reference-content">
              <div><strong>Consultant Name:</strong> {consultantName || '—'}</div>
              <div><strong>Organization Name:</strong> {organizationName || '—'}</div>
            </div>
          </div>

          {/* Bottom Authorities Signatures */}
          <div className="cms-authorities-row">
            <span>ADMISSION OFFICER</span>
            <span>VICE-CHAIRMAN</span>
          </div>
        </article>

        {/* Staff View Section (Screen Only) */}
        <section className="staff-view-section screen-only" style={{ marginTop: '16px' }}>
          <h3>Staff view</h3>
          <div className="staff-view-fields">
            <div className="field-group">
              <label htmlFor="staff-view-name">
                Staff name <span className="required-indicator" style={{ color: '#006747' }}>*</span>
              </label>
              <input
                id="staff-view-name"
                type="text"
                required
                value={staffViewName}
                onChange={(event) => {
                  setStaffViewName(event.target.value);
                  if (staffErrors.name) setStaffErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="Type staff name"
              />
              {staffErrors.name ? <small className="error-text" style={{ color: '#7d4b11', fontWeight: 600 }}>{staffErrors.name}</small> : null}
            </div>
            <div className="field-group">
              <label htmlFor="staff-view-category">
                Staff category <span className="required-indicator" style={{ color: '#006747' }}>*</span>
              </label>
              <input
                id="staff-view-category"
                type="text"
                required
                value={staffViewCategory}
                onChange={(event) => {
                  setStaffViewCategory(event.target.value);
                  if (staffErrors.category) setStaffErrors((prev) => ({ ...prev, category: '' }));
                }}
                placeholder="Type staff category"
              />
              {staffErrors.category ? <small className="error-text" style={{ color: '#7d4b11', fontWeight: 600 }}>{staffErrors.category}</small> : null}
            </div>
          </div>
        </section>

        {/* Action Buttons (Screen Only) */}
        <div className="form-actions preview-actions screen-only" style={{ marginTop: '14px' }}>
          <button type="button" className="secondary-btn" onClick={() => navigate('/register?step=9')}>
            <ArrowLeft size={16} /> Previous
          </button>
          <button type="button" className="secondary-btn" onClick={handleSaveDraft}>
            <Save size={16} /> Save Draft
          </button>
          <button type="button" className="secondary-btn" onClick={() => window.print()}>
            <Printer size={16} /> Print Application
          </button>
          <button type="button" className="secondary-btn" onClick={handleConfirmSeat}>
            <CreditCard size={16} /> Confirm Seat
          </button>
          <button type="button" className="primary-btn" onClick={handleEnquiring}>
            <Send size={16} /> Enquiring
          </button>
        </div>
      </div>

      {/* Modal for viewing uploaded documents */}
      {selectedFilePreview ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedFilePreview.title}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setSelectedFilePreview(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <div>
                <strong style={{ fontSize: '1rem', color: '#1e293b' }}>{selectedFilePreview.title}</strong>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{selectedFilePreview.file.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFilePreview(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close preview"
              >
                <X size={20} color="#334155" />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f1f5f9' }}>
              {selectedFilePreview.file.mimeType === 'application/pdf' ? (
                <iframe
                  src={selectedFilePreview.file.dataUrl}
                  title={selectedFilePreview.title}
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '6px' }}
                />
              ) : (
                <img
                  src={selectedFilePreview.file.dataUrl}
                  alt={selectedFilePreview.title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    transform: `rotate(${Number(selectedFilePreview.file.rotation || 0)}deg)`,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
