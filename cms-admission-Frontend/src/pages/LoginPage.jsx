import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { loginApi } from '../services/api';

const demoCredentials = {
  officer: {
    username: 'officer',
    password: 'CMSdemo1!',
    title: 'Admission Officer',
  },
  vc: {
    username: 'vc',
    password: 'CMSdemo2!',
    title: 'Vice-Chairman',
  },
};

export default function LoginPage() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { auth, loginDemoUser } = useAppContext();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!demoCredentials[role]) {
    return <Navigate to="/" replace />;
  }

  if (auth.role === role) {
    return <Navigate to={role === 'officer' ? '/officer/dashboard' : '/vc/dashboard'} replace />;
  }

  const credentialSet = demoCredentials[role];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiRes = await loginApi(role, form.username, form.password);
      if (apiRes.ok) {
        loginDemoUser(role, apiRes.username || form.username);
        navigate(role === 'officer' ? '/officer/dashboard' : '/vc/dashboard', { replace: true });
        return;
      }
    } catch {
      // offline fallback
    } finally {
      setLoading(false);
    }

    if (form.username === credentialSet.username && form.password === credentialSet.password) {
      loginDemoUser(role, form.username);
      navigate(role === 'officer' ? '/officer/dashboard' : '/vc/dashboard', { replace: true });
      return;
    }
    setError('Invalid username or password.');
  };

  return (
    <main className="page-shell auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/cms-logo.png" alt="CMS College logo" className="brand-logo small" />
          <div>
            <p className="eyebrow accent">CMS College Portal</p>
            <h2>{credentialSet.title} Login</h2>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Username</span>
            <input
              type="text"
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="Enter username"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="Enter password"
            />
          </label>

          {error ? <div className="error-box">{error}</div> : null}

          <button type="submit" className="primary-btn full-width">
            <LogIn size={18} /> Sign in
          </button>
        </form>

      </div>
    </main>
  );
}
