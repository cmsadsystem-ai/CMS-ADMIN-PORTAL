import { Download, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import ApplicationDocuments from '../components/ApplicationDocuments';
import { downloadApplicationsCsv } from '../utils/helpers';

export default function VCDetailPage() {
  const { id } = useParams();
  const { applications } = useAppContext();
  const application = applications.find((item) => item.id === id && item.status === 'Sent to VC');

  if (!application) {
    return (
      <main className="page-shell preview-shell">
        <div className="content-panel empty-panel">
          <h2>Application unavailable</h2>
          <p>The record is either missing or it has not been sent to the VC list by the admission office.</p>
          <Link to="/vc/dashboard" className="primary-btn">Return to VC list</Link>
        </div>
      </main>
    );
  }

  const triggerCsv = () => {
    downloadApplicationsCsv([application], `${application.id}.csv`);
  };

  return (
    <main className="page-shell preview-shell">
      <section className="content-panel application-preview">
        <div className="section-header space-between">
          <div>
            <p className="eyebrow accent">Admission office forwarded record</p>
            <h2>{application.studentName}</h2>
          </div>
          <div className="preview-brand"><img src="/cms-logo.png" alt="CMS logo" className="brand-logo small" /> <span>{application.id}</span></div>
        </div>

        <div className="preview-grid two-column">
          <div className="preview-block">
            <h3>Student summary</h3>
            <ul>
              <li><span>Student name</span><strong>{application.studentName}</strong></li>
              <li><span>EMIS ID</span><strong>{application.emisId}</strong></li>
              <li><span>Category</span><strong>{application.admissionCategory}</strong></li>
              <li><span>Course</span><strong>{application.coursePreference?.firstPreference}</strong></li>
              <li><span>Status</span><strong>{application.status}</strong></li>
            </ul>
          </div>

          <div className="preview-block">
            <h3>Academic details</h3>
            <ul>
              <li><span>Mathematics</span><strong>{application.mathematics}</strong></li>
              <li><span>Physics total</span><strong>{Number(application.physicsTheory || 0) + Number(application.physicsPractical || 0)}</strong></li>
              <li><span>Chemistry total</span><strong>{Number(application.chemistryTheory || 0) + Number(application.chemistryPractical || 0)}</strong></li>
              <li><span>Cut-off</span><strong>{Number(application.cutOffMarks || 0).toFixed(2)}</strong></li>
            </ul>
          </div>
        </div>

        <ApplicationDocuments
          documents={application.documents}
          signature={application.signature}
          studentSignature={application.studentSignature}
          parentSignature={application.parentSignature}
        />

        <div className="form-actions preview-actions">
          <Link to="/vc/dashboard" className="secondary-btn">Back to list</Link>
          <button type="button" className="secondary-btn" onClick={() => window.print()}><Printer size={16} /> Print / Save as PDF</button>
          <button type="button" className="primary-btn" onClick={triggerCsv}><Download size={16} /> Export Excel/CSV</button>
        </div>
      </section>
    </main>
  );
}
