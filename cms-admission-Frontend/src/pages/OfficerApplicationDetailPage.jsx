import { useMemo, useState } from 'react';
import { CheckCheck, Save, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import ApplicationDocuments from '../components/ApplicationDocuments';
import { formatDate } from '../utils/helpers';

const officeDocuments = [
  ['SSLC', 'SSLC Certificate'],
  ['HSC', 'HSC Certificate'],
  ['TC', 'Transfer Certificate (TC)'],
  ['CC', 'Conduct Certificate (CC)'],
  ['NativityCertificate', 'Nativity Certificate'],
  ['IncomeCertificate', 'Income Certificate'],
  ['AadhaarCard', 'Aadhaar Document'],
  ['FirstGraduateCertificate', 'First Graduate Certificate'],
  ['PassportSizePhotographs', 'Student Photo'],
];

export default function OfficerApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    applications,
    updateApplication,
    confirmApplication,
    forwardApplicationToVC,
    deleteApplication,
    correctionHistory,
  } = useAppContext();
  const application = useMemo(() => applications.find((item) => item.id === id), [applications, id]);
  const [draftApplication, setDraftApplication] = useState(() => application || {});
  const [note, setNote] = useState('');

  if (!application) {
    return (
      <main className="page-shell preview-shell">
        <div className="content-panel empty-panel">
          <h2>Application not found</h2>
          <p>The requested student record could not be located in local demo storage.</p>
          <button type="button" className="primary-btn" onClick={() => navigate('/officer/dashboard')}>Back to dashboard</button>
        </div>
      </main>
    );
  }

  const history = correctionHistory.filter((entry) => entry.applicationId === id);

  const handleSave = () => {
    updateApplication(id, draftApplication, note, 'Admission Officer');
    setNote('');
    alert('Changes saved locally and logged in the demo history.');
  };

  const saveCurrentChanges = () => {
    updateApplication(id, draftApplication, note, 'Admission Officer');
    setNote('');
  };

  const handleConfirm = () => {
    if (application.status !== 'Enquiring') return;
    const confirmed = window.confirm('Confirm this application and move it to the confirmed list?');
    if (!confirmed) return;
    saveCurrentChanges();
    confirmApplication(id, 'Admission Officer');
    navigate('/officer/dashboard', { replace: true });
  };

  const handleForwardToVC = () => {
    if (application.status !== 'Confirmed') return;
    const confirmed = window.confirm('Send this confirmed application to the VC list?');
    if (!confirmed) return;
    saveCurrentChanges();
    forwardApplicationToVC(id, 'Admission Officer');
    navigate('/officer/dashboard', { replace: true });
  };

  const updateDocumentCheck = (documentKey, type, checked) => {
    setDraftApplication((previous) => ({
      ...previous,
      documentChecklist: {
        ...previous.documentChecklist,
        [documentKey]: {
          ...previous.documentChecklist?.[documentKey],
          [type]: checked,
        },
      },
    }));
  };

  const actionLabel = application.status === 'Enquiring'
    ? 'Confirm Application'
    : application.status === 'Confirmed'
      ? 'Send to VC'
      : 'Already sent to VC';
  const handleWorkflowAction = application.status === 'Enquiring' ? handleConfirm : handleForwardToVC;

  return (
    <main className="page-shell admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <img src="/cms-logo.png" alt="CMS logo" className="brand-logo small" />
          <div>
            <p className="eyebrow accent">Officer View</p>
            <strong>{application.studentName}</strong>
          </div>
        </div>
      </aside>

      <section className="admin-content">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow accent">Application review</p>
            <h2>{application.id}</h2>
          </div>
          <div className="toolbar" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="secondary-btn compact"
              onClick={() => {
                const confirmed = window.confirm(`Are you sure you want to delete application "${application.id}" (${application.studentName || 'Student'})? This action cannot be undone.`);
                if (confirmed) {
                  deleteApplication(application.id);
                  navigate('/officer/dashboard', { replace: true });
                }
              }}
              style={{ color: '#4b5563', borderColor: '#d1d5db' }}
            >
              <Trash2 size={16} /> Delete Application
            </button>
            {application.status !== 'Sent to VC' ? (
              <button type="button" className="primary-btn compact" onClick={handleWorkflowAction}>
                <CheckCheck size={16} /> {actionLabel}
              </button>
            ) : <span className="badge badge-success">{actionLabel}</span>}
          </div>
        </header>

        <div className="content-panel form-panel detail-panel">
          <div className="preview-grid two-column">
            <div className="field-group"><label>Student name</label><input value={draftApplication.studentName || ''} onChange={(event) => setDraftApplication((prev) => ({ ...prev, studentName: event.target.value }))} /></div>
            <div className="field-group"><label>Email ID</label><input value={draftApplication.email || ''} onChange={(event) => setDraftApplication((prev) => ({ ...prev, email: event.target.value }))} /></div>
            <div className="field-group"><label>EMIS ID</label><input value={draftApplication.emisId || ''} onChange={(event) => setDraftApplication((prev) => ({ ...prev, emisId: event.target.value }))} /></div>
            <div className="field-group"><label>Application date</label><input type="date" value={draftApplication.applicationDate || ''} onChange={(event) => setDraftApplication((prev) => ({ ...prev, applicationDate: event.target.value }))} /></div>
            <div className="field-group"><label>Date of Birth</label><input type="date" value={draftApplication.dateOfBirth || ''} onChange={(event) => setDraftApplication((prev) => ({ ...prev, dateOfBirth: event.target.value }))} /></div>
            <div className="field-group"><label>Gender</label><input value={draftApplication.gender || ''} onChange={(event) => setDraftApplication((prev) => ({ ...prev, gender: event.target.value }))} /></div>
            <div className="field-group"><label>Aadhaar Number</label><input value={draftApplication.aadhaar || ''} onChange={(event) => setDraftApplication((prev) => ({ ...prev, aadhaar: event.target.value }))} /></div>
            <div className="field-group"><label>Blood Group</label><input value={draftApplication.bloodGroup || ''} onChange={(event) => setDraftApplication((prev) => ({ ...prev, bloodGroup: event.target.value }))} /></div>
            <div className="field-group"><label>Community</label><input value={draftApplication.community || ''} onChange={(event) => setDraftApplication((prev) => ({ ...prev, community: event.target.value }))} /></div>
            <div className="field-group"><label>Category</label><input value={draftApplication.category || ''} onChange={(event) => setDraftApplication((prev) => ({ ...prev, category: event.target.value }))} /></div>
            <div className="field-group"><label>Student Mobile</label><input value={draftApplication.studentMobile || ''} onChange={(event) => setDraftApplication((prev) => ({ ...prev, studentMobile: event.target.value }))} /></div>
            <div className="field-group"><label>Admission Category</label><input value={draftApplication.admissionCategory || ''} onChange={(event) => setDraftApplication((prev) => ({ ...prev, admissionCategory: event.target.value }))} /></div>
            <div className="field-group"><label>Programme / Degree</label><input value={`${draftApplication.programme || ''} ${draftApplication.degree ? `- ${draftApplication.degree}` : ''}`} readOnly /></div>
            <div className="field-group"><label>Selected Course</label><input value={draftApplication.coursePreference?.firstPreference || ''} onChange={(event) => setDraftApplication((prev) => ({ ...prev, coursePreference: { ...prev.coursePreference, firstPreference: event.target.value } }))} /></div>
            <div className="field-group"><label>First Graduate (FG)</label><input value={draftApplication.firstGraduate || ''} readOnly /></div>
            <div className="field-group"><label>Status</label><input value={draftApplication.status || ''} readOnly /></div>
            <div className="field-group full-width"><label>Communication Address</label><textarea value={draftApplication.communicationAddress || ''} onChange={(event) => setDraftApplication((prev) => ({ ...prev, communicationAddress: event.target.value }))} rows="2" /></div>
            <div className="field-group"><label>District / State / PIN</label><input value={`${draftApplication.district || ''}, ${draftApplication.state || ''} - ${draftApplication.pinCode || ''}`} readOnly /></div>
            <div className="field-group"><label>Accommodation / Transport</label><input value={`${draftApplication.accommodation || 'Not specified'}${draftApplication.busRoute ? ` (Route: ${draftApplication.busRoute})` : ''}`} readOnly /></div>
            <div className="field-group"><label>Father Name / Mobile</label><input value={`${draftApplication.fatherName || '—'} / ${draftApplication.fatherMobile || draftApplication.parentMobile || '—'} (${draftApplication.fatherOccupation || '—'})`} readOnly /></div>
            <div className="field-group"><label>Mother Name / Mobile</label><input value={`${draftApplication.motherName || '—'} / ${draftApplication.motherMobile || '—'} (${draftApplication.motherOccupation || '—'})`} readOnly /></div>
            <div className="field-group"><label>Guardian Name / Mobile</label><input value={`${draftApplication.guardianName || '—'} / ${draftApplication.guardianMobile || '—'} (${draftApplication.guardianOccupation || '—'})`} readOnly /></div>
            <div className="field-group"><label>School Name & Address</label><input value={`${draftApplication.schoolName || '—'}, ${draftApplication.schoolAddress || '—'}`} readOnly /></div>
            <div className="field-group"><label>Class 12 / HSC Total Marks</label><input value={`${draftApplication.hscMarks ?? '—'} / 600`} readOnly /></div>
            <div className="field-group"><label>PCM Marks (Maths / Physics / Chem)</label><input value={`M: ${draftApplication.mathematics ?? '—'}, P: ${draftApplication.physicsMarks ?? '—'}, C: ${draftApplication.chemistryMarks ?? '—'}`} readOnly /></div>
            <div className="field-group"><label>Cutoff Marks</label><input value={`${draftApplication.cutOffMarks ? Number(draftApplication.cutOffMarks).toFixed(2) : '—'} / 200`} readOnly /></div>
            <div className="field-group full-width"><label>Correction notes</label><textarea value={note} onChange={(event) => setNote(event.target.value)} rows="3" placeholder="Add officer corrections or notes" /></div>
            <div className="field-group full-width"><label>Student declaration</label><textarea value={draftApplication.declaration ? 'Accepted' : 'Not accepted'} readOnly /></div>
          </div>

          <ApplicationDocuments
            documents={{
              ...(draftApplication.documents || {}),
              ...(draftApplication.cashReceipt?.dataUrl ? { cashReceipt: draftApplication.cashReceipt } : {}),
            }}
            signature={draftApplication.signature}
            studentSignature={draftApplication.studentSignature}
            parentSignature={draftApplication.parentSignature}
          />

          <section className="certificate-status-wrap">
            <h3>Office use — documents received</h3>
            <p className="field-help">Tick Original or Xerox after the physical certificate has been received. Uploaded files are shown above for reference.</p>
            <div className="table-scroll">
              <table className="data-table certificate-table">
                <thead><tr><th>Document</th><th>Student upload</th><th>Original received</th><th>Xerox received</th></tr></thead>
                <tbody>
                  {officeDocuments.map(([key, label]) => (
                    <tr key={key}>
                      <td>{label}</td>
                      <td>{draftApplication.documents?.[key]?.dataUrl ? 'Uploaded' : 'Not uploaded'}</td>
                      {['original', 'xerox'].map((type) => (
                        <td key={type}>
                          <input
                            type="checkbox"
                            className="office-document-checkbox"
                            aria-label={`${label} ${type} received`}
                            checked={Boolean(draftApplication.documentChecklist?.[key]?.[type])}
                            onChange={(event) => updateDocumentCheck(key, type, event.target.checked)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="detail-history">
            <h3>History</h3>
            {history.length ? history.map((entry) => (
              <div className="history-item" key={entry.id}><strong>{entry.actor}</strong><span>{formatDate(entry.createdAt)}</span><p>{entry.note}</p></div>
            )) : <p>No correction history exists yet.</p>}
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="secondary-btn" onClick={() => navigate('/officer/dashboard')}>
            Back to dashboard
          </button>
          <button type="button" className="primary-btn" onClick={handleSave}>
            <Save size={16} /> Save Changes
          </button>
        </div>
      </section>
    </main>
  );
}
