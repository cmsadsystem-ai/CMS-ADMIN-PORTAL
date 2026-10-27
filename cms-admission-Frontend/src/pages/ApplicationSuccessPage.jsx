import { CheckCircle2, Download, Printer } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function ApplicationSuccessPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const { lastSubmitted } = useAppContext();
  const applicationId = params.get('id') || lastSubmitted?.id || 'CMS-UNKNOWN';
  const studentName = lastSubmitted?.studentName || 'Student';

  return (
    <main className="page-shell success-shell">
      <div className="success-card">
        <div className="success-icon"><CheckCircle2 size={54} /></div>
        <p className="eyebrow accent">Application Submitted</p>
        <h2>Thank you, {studentName}.</h2>
        <p className="success-detail">Your admission application has been received and saved locally in this frontend demo.</p>

        <div className="success-meta">
          <div className="meta-block">
            <span>Application ID</span>
            <strong>{applicationId}</strong>
          </div>
          <div className="meta-block">
            <span>Status</span>
            <strong>
              {lastSubmitted?.status || 'Enquiring'}
              {lastSubmitted?.paymentStatus === 'Unpaid' ? ' — Admission fee unpaid' : ''}
            </strong>
          </div>
        </div>

        <div className="warning-box">
          Warning: this demo stores admission data locally in the browser. The backend and database integration must be implemented separately.
        </div>

        <div className="cta-row success-actions">
          <Link to="/" className="primary-btn">Back to home</Link>
          <button type="button" className="secondary-btn" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </button>
          <a href="/" className="secondary-btn" onClick={(event) => event.preventDefault() && window.print()}>
            <Download size={16} /> Save as PDF
          </a>
        </div>
      </div>
    </main>
  );
}
