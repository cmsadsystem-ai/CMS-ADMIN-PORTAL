import { ArrowRight, BellRing, Download, LogOut, Search, Settings } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { downloadApplicationsCsv, formatDate } from '../utils/helpers';

export default function OfficerDashboardPage() {
  const navigate = useNavigate();
  const { applications, auth, logoutDemoUser } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const filteredApplications = applications.filter((app) => {
    const searchableFields = [
      app.id,
      app.studentName,
      app.emisId,
      app.coursePreference?.firstPreference,
      app.admissionCategory,
    ];
    const matchesSearch = !normalizedSearch || searchableFields.some((field) => (
      String(field || '').toLocaleLowerCase().includes(normalizedSearch)
    ));
    return matchesSearch
      && (!categoryFilter || app.admissionCategory === categoryFilter)
      && (!courseFilter || app.coursePreference?.firstPreference === courseFilter);
  });
  const enquiring = filteredApplications.filter((app) => app.status === 'Enquiring');
  const confirmed = filteredApplications.filter((app) => app.status === 'Confirmed');
  const categories = [...new Set(applications.map((app) => app.admissionCategory).filter(Boolean))].sort();
  const courses = [...new Set(applications.map((app) => app.coursePreference?.firstPreference).filter(Boolean))].sort();

  const handleLogout = () => {
    logoutDemoUser();
    navigate('/login/officer', { replace: true });
  };

  return (
    <main className="page-shell admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <img src="/cms-logo.png" alt="CMS logo" className="brand-logo small" />
          <div>
            <p className="eyebrow accent">Officer Portal</p>
            <strong>Admission Office</strong>
          </div>
        </div>

        <nav className="admin-nav">
          <Link to="/officer/dashboard" className="nav-item active">Dashboard</Link>
          <Link to="/officer/settings" className="nav-item">Background settings</Link>
          <button type="button" className="nav-item button-link" onClick={handleLogout}><LogOut size={16} /> Logout</button>
        </nav>
      </aside>

      <section className="admin-content">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow accent">Welcome back</p>
            <h2>{auth.username || 'Officer'}</h2>
          </div>
          <div className="toolbar">
            <button type="button" className="secondary-btn compact"><BellRing size={16} /> Alerts</button>
            <button type="button" className="secondary-btn compact" onClick={() => navigate('/officer/settings')}><Settings size={16} /> Settings</button>
          </div>
        </header>

        <div className="content-panel dashboard-filters">
          <div className="field-group">
            <label htmlFor="applicationSearch">Search applications</label>
            <div className="mini-control"><Search size={14} /><input id="applicationSearch" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Student, application, EMIS, course" /></div>
          </div>
          <div className="field-group">
            <label htmlFor="categoryFilter">Admission category</label>
            <select id="categoryFilter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="courseFilter">Course</label>
            <select id="courseFilter" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
              <option value="">All courses</option>
              {courses.map((course) => <option key={course} value={course}>{course}</option>)}
            </select>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card"><span>Enquiring</span><strong>{applications.filter((app) => app.status === 'Enquiring').length}</strong></div>
          <div className="stat-card"><span>Confirmed</span><strong>{applications.filter((app) => app.status === 'Confirmed').length}</strong></div>
          <div className="stat-card"><span>Sent to VC</span><strong>{applications.filter((app) => app.status === 'Sent to VC').length}</strong></div>
          <div className="stat-card"><span>Matching applications</span><strong>{filteredApplications.length}</strong></div>
        </div>

        <div className="panel-grid two-panel">
          <div className="content-panel table-card">
            <div className="section-header space-between">
              <h3>Enquiring list</h3>
              <button type="button" className="secondary-btn compact" onClick={() => downloadApplicationsCsv(enquiring, 'cms-enquiring-applications.csv')}><Download size={14} /> Export Excel/CSV</button>
            </div>

            <table className="data-table">
              <thead>
                <tr><th>App ID</th><th>Student</th><th>EMIS ID</th><th>Course</th><th>Date</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {enquiring.length ? enquiring.slice(0, 8).map((app) => (
                  <tr key={app.id}>
                    <td>{app.id}</td>
                    <td>{app.studentName}</td>
                    <td>{app.emisId}</td>
                    <td>{app.coursePreference?.firstPreference || '—'}</td>
                    <td>{formatDate(app.submittedAt)}</td>
                    <td><span className="badge badge-warning">{app.status}</span></td>
                    <td><Link to={`/officer/application/${app.id}`}>View/Edit</Link></td>
                  </tr>
                )) : <tr><td colSpan="7">No applications are waiting for review.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="content-panel table-card">
            <div className="section-header space-between">
              <h3>Confirmed list</h3>
              <button type="button" className="secondary-btn compact" onClick={() => downloadApplicationsCsv(confirmed, 'cms-confirmed-applications.csv')}><Download size={14} /> Export Excel/CSV</button>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>App ID</th><th>Student</th><th>Course</th><th>Date</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {confirmed.length ? confirmed.slice(0, 8).map((app) => (
                  <tr key={app.id}><td>{app.id}</td><td>{app.studentName}</td><td>{app.coursePreference?.firstPreference || '—'}</td><td>{formatDate(app.confirmedAt || app.submittedAt)}</td><td><span className="badge badge-success">Confirmed</span></td><td><Link to={`/officer/application/${app.id}`}>Review / Send to VC</Link></td></tr>
                )) : <tr><td colSpan="6">No confirmed applications waiting to be sent to VC.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="content-panel table-card">
          <div className="section-header space-between">
            <h3>Recently submitted applications</h3>
            <button type="button" className="secondary-btn compact" onClick={() => downloadApplicationsCsv(filteredApplications, 'cms-filtered-applications.csv')}><Download size={14} /> Export Excel/CSV</button>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>App ID</th><th>Student</th><th>EMIS ID</th><th>Course</th><th>Status</th><th>Date</th><th>Action</th></tr>
            </thead>
            <tbody>
              {[...filteredApplications].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).slice(0, 6).map((app) => (
                <tr key={app.id}><td>{app.id}</td><td>{app.studentName}</td><td>{app.emisId}</td><td>{app.coursePreference?.firstPreference || '—'}</td><td><span className={`badge ${app.status === 'Enquiring' ? 'badge-warning' : 'badge-success'}`}>{app.status}</span></td><td>{formatDate(app.submittedAt)}</td><td><Link to={`/officer/application/${app.id}`}>Review <ArrowRight size={14} /></Link></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
