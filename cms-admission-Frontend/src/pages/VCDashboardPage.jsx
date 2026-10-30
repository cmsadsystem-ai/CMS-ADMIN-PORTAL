import { Download, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { downloadApplicationsCsv, formatDate } from '../utils/helpers';

export default function VCDashboardPage() {
  const navigate = useNavigate();
  const { applications, auth, logoutDemoUser, isLiveConnected } = useAppContext();
  const sentToVC = applications.filter((app) => app.status === 'Sent to VC' || app.status === 'Confirmed' || app.status === 'Confirm');
  const [searchTerm, setSearchTerm] = useState('');
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const filteredSentToVC = sentToVC.filter((app) => [
    app.id,
    app.studentName,
    app.emisId,
    app.coursePreference?.firstPreference,
    app.admissionCategory,
  ].some((field) => String(field || '').toLocaleLowerCase().includes(normalizedSearch)));

  const handleLogout = () => {
    logoutDemoUser();
    navigate('/login/vc', { replace: true });
  };

  const handleCsvExport = () => {
    downloadApplicationsCsv(filteredSentToVC, 'cms-vc-applications.csv');
  };

  return (
    <main className="page-shell admin-shell vc-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <img src="/cms-logo.png" alt="CMS logo" className="brand-logo small" />
          <div>
            <p className="eyebrow accent">VC Portal</p>
            <strong>Vice-Chairman</strong>
          </div>
        </div>

        <nav className="admin-nav">
          <Link to="/vc/dashboard" className="nav-item active">Applications from admission office</Link>
          <button type="button" className="nav-item button-link" onClick={handleLogout}>Logout</button>
        </nav>
      </aside>

      <section className="admin-content">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow accent">Chairman&apos;s view</p>
            <h2>{auth.username || 'Vice-Chairman'}</h2>
          </div>
          <div className="toolbar" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: isLiveConnected ? '#15803d' : '#6b7280',
              backgroundColor: isLiveConnected ? '#dcfce7' : '#f3f4f6',
              padding: '4px 10px',
              borderRadius: '999px',
              border: `1px solid ${isLiveConnected ? '#bbf7d0' : '#e5e7eb'}`
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isLiveConnected ? '#16a34a' : '#9ca3af',
                boxShadow: isLiveConnected ? '0 0 0 2px rgba(34,197,94,0.3)' : 'none'
              }}></span>
              {isLiveConnected ? 'Live Central Sync' : 'Reconnecting...'}
            </span>
            <button type="button" className="secondary-btn compact" onClick={handleCsvExport}><Download size={16} /> Export Excel/CSV</button>
          </div>
        </header>

        <div className="stats-grid">
          <div className="stat-card"><span>Sent to VC</span><strong>{sentToVC.length}</strong></div>
          <div className="stat-card"><span>Matching records</span><strong>{filteredSentToVC.length}</strong></div>
        </div>

        <div className="content-panel table-card">
          <div className="section-header space-between">
            <h3>Applications forwarded by admission office</h3>
            <div className="mini-control"><Search size={14} /> <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search forwarded students" aria-label="Search forwarded students" /></div>
          </div>

          <table className="data-table">
            <thead>
              <tr><th>App ID</th><th>Student</th><th>EMIS ID</th><th>Course</th><th>Category</th><th>Confirmation Date</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filteredSentToVC.length ? filteredSentToVC.map((app) => (
                <tr key={app.id}><td>{app.id}</td><td>{app.studentName}</td><td>{app.emisId}</td><td>{app.coursePreference?.firstPreference || '—'}</td><td>{app.admissionCategory || '—'}</td><td>{formatDate(app.forwardedAt || app.confirmedAt || app.submittedAt)}</td><td><span className="badge badge-success">{app.status}</span></td><td><Link to={`/vc/confirmed/${app.id}`} className="btn-review">Review / Open</Link></td></tr>
              )) : <tr><td colSpan="8">{sentToVC.length ? 'No forwarded applications match your search.' : 'No applications have been sent to VC yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
