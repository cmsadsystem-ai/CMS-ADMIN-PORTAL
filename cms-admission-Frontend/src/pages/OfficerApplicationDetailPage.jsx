import { useMemo, useState } from 'react';
import { CheckCheck, Save } from 'lucide-react';
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
          <div className="toolbar">
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
            <div className="field-group"><label>EMIS ID</label><input value={draftApplication.emisId || ''} onChange={(event) => setDraftApplication((prev) => ({ ...prev, emisId: event.target.value }))} /></div>
            <div className="field-group"><label>Application date</label><input type="date" value={draftApplication.applicationDate || ''} onChange={(event) => setDraftApplication((prev) => ({ ...prev, applicationDate: event.target.value }))} /></div>
            <div className="field-group"><label>Status</label><input value={draftApplication.status || ''} readOnly /></div>
            <div className="field-group full-width"><label>Correction notes</label><textarea value={note} onChange={(event) => setNote(event.target.value)} rows="3" placeholder="Add officer corrections or notes" /></div>
            <div className="field-group full-width"><label>Student declaration</label><textarea value={draftApplication.declaration ? 'Accepted' : 'Not accepted'} readOnly /></div>
          </div>

          <ApplicationDocuments
            documents={draftApplication.documents}
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
