import { useState } from 'react';
import { ArrowLeft, CreditCard, Printer, Save, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { calculateCutoff, formatDate } from '../utils/helpers';

function display(value) {
  return value === null || value === undefined || String(value).trim() === '' ? 'Not provided' : value;
}

function PreviewBlock({ title, rows }) {
  return (
    <section className="preview-block" style={{ margin: '0 0 8px', padding: 0, border: 0, borderRadius: 0, background: 'transparent' }}>
      <h3 style={{ margin: '0', padding: '4px 6px', fontSize: '0.9rem', background: '#edf2ef', border: '1px solid #68756f' }}>{title}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
        <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th style={{ width: '34%', padding: '3px 6px', border: '1px solid #87918c', textAlign: 'left', fontWeight: 500 }}>{label}</th>
            <td style={{ padding: '3px 6px', border: '1px solid #87918c', overflowWrap: 'anywhere' }}>{display(value)}</td>
          </tr>
        ))}
        </tbody>
      </table>
    </section>
  );
}

export default function ApplicationPreviewPage() {
  const navigate = useNavigate();
  const { draft, saveDraft, submitApplication } = useAppContext();
  const [staffViewName, setStaffViewName] = useState(draft.staffViewName || '');
  const [staffViewCategory, setStaffViewCategory] = useState(draft.staffViewCategory || '');
  const cutoff = calculateCutoff({
    mathematics: draft.mathematics,
    physics: draft.physicsMarks,
    chemistry: draft.chemistryMarks,
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

  const handleEnquiring = () => {
    const application = submitApplication({
      ...draft,
      staffViewName,
      staffViewCategory,
      cutOffMarks: cutoff ?? '',
    });
    navigate(`/application-success?id=${encodeURIComponent(application.id)}`);
  };

  const handleSaveDraft = () => {
    saveDraft({ ...draft, staffViewName, staffViewCategory, cutOffMarks: cutoff ?? '' });
    window.alert('Application draft saved in this browser.');
  };

  return (
    <main className="page-shell preview-shell" style={{ padding: '14px 10px' }}>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          body, #root { background: #fff !important; }
          .student-background, .background-audio-control { display: none !important; }
          .page-shell.preview-shell { min-height: 0 !important; padding: 0 !important; }
          .application-preview { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: #fff !important; backdrop-filter: none !important; }
          .application-preview .preview-actions, .application-preview .screen-only { display: none !important; }
          .application-preview .eyebrow { display: none !important; }
          .application-preview table, .application-preview section { break-inside: avoid; }
        }
      `}</style>
      <section className="content-panel application-preview" style={{ width: 'min(820px, 100%)', padding: '12px', border: '1px solid rgba(255,255,255,.5)', borderRadius: 0, background: 'rgba(255,255,255,.3)', backdropFilter: 'blur(2px)', boxShadow: 'none' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingBottom: '8px', marginBottom: '8px', borderBottom: '2px solid #35443c' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <img src="/cms-logo.png" alt="CMS College of Engineering logo" className="brand-logo small" style={{ width: '38px', height: '38px' }} />
            <div>
              <p className="eyebrow accent" style={{ margin: 0 }}>CMS College of Engineering</p>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Admission Application</h2>
            </div>
          </div>
          <strong style={{ fontSize: '0.82rem' }}>Form No: {display(draft.formNumber)}<br />Date: {formatDate(draft.applicationDate)}</strong>
        </header>

        <div>
          <PreviewBlock title="Admission and programme" rows={[
            ['Admission category', draft.admissionCategory],
            ['Programme', draft.programme],
            ['Degree', draft.degree],
            ['Selected course', draft.coursePreference?.firstPreference],
            ['FG (First Graduate)', draft.firstGraduate],
          ]} />
          <PreviewBlock title="Personal information" rows={[
            ['Full name', draft.studentName],
            ['Date of birth', formatDate(draft.dateOfBirth)],
            ['Gender', draft.gender],
            ['Aadhaar number', String(draft.aadhaar || '').replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ')],
            ['Blood group', draft.bloodGroup],
            ['Community', draft.community],
            ['Category', draft.category],
            ['Mobile number', draft.studentMobile ? `+91 ${draft.studentMobile}` : ''],
            ['EMIS ID', draft.emisId],
            ['District', draft.district],
            ['State', draft.state],
            ['PIN code', draft.pinCode],
            ['Communication address', draft.communicationAddress],
          ]} />
          <PreviewBlock title="Parents and guardian details" rows={[
            ['Father name', draft.fatherName],
            ['Father occupation', draft.fatherOccupation],
            ['Father mobile number', (draft.fatherMobile || draft.parentMobile) ? `+91 ${draft.fatherMobile || draft.parentMobile}` : ''],
            ['Mother name', draft.motherName],
            ['Mother occupation', draft.motherOccupation],
            ['Mother mobile number', draft.motherMobile ? `+91 ${draft.motherMobile}` : ''],
            ['Guardian name', draft.guardianName],
            ['Guardian occupation', draft.guardianOccupation],
            ['Guardian mobile number', draft.guardianMobile ? `+91 ${draft.guardianMobile}` : ''],
          ]} />
          <PreviewBlock title="School and education" rows={[
            ['School name', draft.schoolName],
            ['School address', draft.schoolAddress],
            ['Class 12 / HSC marks', draft.hscMarks],
            ['Mathematics marks', draft.mathematics],
            ['Physics marks', draft.physicsMarks],
            ['Chemistry marks', draft.chemistryMarks],
            ['Automatically calculated cutoff', cutoff === null ? 'Not calculated — enter valid subject marks' : `${cutoff.toFixed(2)} / 200`],
          ]} />
          <PreviewBlock title="Accommodation and declarations" rows={[
            ['Accommodation type', draft.accommodation],
            ['Bus route', draft.accommodation === 'Day Scholar' ? draft.busRoute : ''],
            ['Transport requirements', draft.accommodation === 'Day Scholar' ? draft.transportRequirements : ''],
            ['Student declaration', draft.declaration ? 'Accepted' : 'Not accepted'],
            ['Parent declaration', draft.parentDeclaration ? 'Accepted' : 'Not accepted'],
          ]} />
        </div>

        <section style={{ margin: '0 0 8px' }}>
          <h3 style={{ margin: 0, padding: '4px 6px', fontSize: '0.9rem', background: '#edf2ef', border: '1px solid #68756f' }}>Fees Structure</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
            <thead><tr>{['Fee item', 'Amount (₹)', 'Frequency / details'].map((heading) => <th key={heading} style={{ padding: '3px 6px', border: '1px solid #87918c', textAlign: 'left' }}>{heading}</th>)}</tr></thead>
            <tbody>
              {[
                ['Admission fees', '5,000', 'One time'],
                ['Consortium fees', '550', 'One time'],
                ['RRA amount (Anna University)', '2,500', 'One time'],
                ['Sports fees (Anna University)', '625', 'One time · Four years'],
                ['Group insurance', '100', 'One time'],
                ['Syllabus fees (Anna University)', '200', 'One time'],
                ['NSS fees (Anna University)', '25', 'Frequency not specified'],
                ['Lab coat', '500', 'Frequency not specified'],
                ['ID card', '100', 'Frequency not specified'],
                ['Book fees & exam paper fees', 'Not specified', 'Every semester'],
                ['Tuition fees — First Graduate (OC/BC/BC(M)/MBC & DNC)', 'Not specified', 'Category-based'],
                ['Tuition fees — Non-First Graduate (OC/BC/BC(M)/MBC & DNC)', 'Not specified', 'Category-based'],
                ['Tuition fees — SC/SC(A)/ST/SCC', 'Not specified', 'Category-based'],
                ['Hostel fees (OC/BC/BC(M)/MBC & DNC)', 'Not specified', 'Category-based'],
                ['Hostel fees — SC/SC(A)/ST/SCC', 'Not specified', 'Category-based'],
                ['Hostel / transport application form', '50', 'Frequency not specified'],
                ['Transport fees', 'Not specified', 'Per year'],
              ].map(([item, amount, detail]) => (
                <tr key={item}>{[item, amount, detail].map((value, index) => <td key={index} style={{ padding: '2px 6px', border: '1px solid #87918c' }}>{value}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ margin: '0 0 8px' }}>
          <h3 style={{ margin: 0, padding: '4px 6px', fontSize: '0.9rem', background: '#edf2ef', border: '1px solid #68756f' }}>Documents submitted</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <tbody>
              {Object.entries(draft.documents || {}).filter(([, file]) => file?.dataUrl).map(([key, file]) => (
                <tr key={key}><th style={{ width: '34%', padding: '3px 6px', border: '1px solid #87918c', textAlign: 'left', fontWeight: 500 }}>{key}</th><td style={{ padding: '3px 6px', border: '1px solid #87918c' }}>{file.name}</td></tr>
              ))}
              {!Object.values(draft.documents || {}).some((file) => file?.dataUrl) ? (
                <tr><td colSpan="2" style={{ padding: '3px 6px', border: '1px solid #87918c' }}>No optional documents uploaded.</td></tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <section style={{ margin: '8px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', fontSize: '0.76rem' }}>
          <div style={{ minHeight: '48px', borderBottom: '1px solid #35443c', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {(draft.studentSignature || draft.signature)?.dataUrl ? <img src={(draft.studentSignature || draft.signature).dataUrl} alt="Student signature" style={{ maxWidth: '150px', maxHeight: '36px', objectFit: 'contain', objectPosition: 'left bottom' }} /> : null}
            <span>Signature of the student</span>
          </div>
          <div style={{ minHeight: '48px', borderBottom: '1px solid #35443c', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {draft.parentSignature?.dataUrl ? <img src={draft.parentSignature.dataUrl} alt="Parent signature" style={{ maxWidth: '150px', maxHeight: '36px', objectFit: 'contain', objectPosition: 'left bottom' }} /> : null}
            <span>Signature of the parent</span>
          </div>
        </section>

        <footer style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', fontSize: '0.75rem' }}>
          <strong>ADMISSION OFFICER</strong><strong>VICE-CHAIRMAN</strong>
        </footer>
        <section className="staff-view-section screen-only">
          <h3>Staff view</h3>
          <div className="staff-view-fields">
            <label className="field-group" htmlFor="staff-view-name">
              Staff name
              <input
                id="staff-view-name"
                type="text"
                value={staffViewName}
                onChange={(event) => setStaffViewName(event.target.value)}
                placeholder="Type staff name"
              />
            </label>
            <label className="field-group" htmlFor="staff-view-category">
              Staff category
              <input
                id="staff-view-category"
                type="text"
                value={staffViewCategory}
                onChange={(event) => setStaffViewCategory(event.target.value)}
                placeholder="Type staff category"
              />
            </label>
          </div>
        </section>
        <p className="upload-storage-note screen-only" style={{ marginTop: '8px' }}>Uploaded files and this application are stored in this browser demo only; they are not sent to a server.</p>

        <div className="form-actions preview-actions screen-only" style={{ marginTop: '10px' }}>
          <button type="button" className="secondary-btn" onClick={() => navigate('/register?step=9')}>
            <ArrowLeft size={16} /> Previous
          </button>
          <button type="button" className="secondary-btn" onClick={handleSaveDraft}>
            <Save size={16} /> Save
          </button>
          <button type="button" className="secondary-btn" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </button>
          <button type="button" className="secondary-btn" onClick={() => navigate('/payment')}>
            <CreditCard size={16} /> Confirm Seat
          </button>
          <button type="button" className="primary-btn" onClick={handleEnquiring}>
            <Send size={16} /> Enquiring
          </button>
        </div>
      </section>
    </main>
  );
}
