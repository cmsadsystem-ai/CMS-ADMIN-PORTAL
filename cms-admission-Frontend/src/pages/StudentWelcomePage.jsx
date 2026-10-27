import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

export default function StudentWelcomePage() {
  const navigate = useNavigate();
  const registrationUrl = new URL('/register', window.location.href);
  if (
    ['localhost', '127.0.0.1'].includes(registrationUrl.hostname)
    && import.meta.env.VITE_ADMISSION_DEV_HOST !== 'localhost'
  ) {
    registrationUrl.hostname = import.meta.env.VITE_ADMISSION_DEV_HOST;
  }
  const registrationLink = registrationUrl.toString();

  return (
    <main className="page-shell home-shell">
      <header className="topbar topbar-public">
        <div className="brand-block">
          <img src="/cms-logo.png" alt="CMS College of Engineering logo" className="brand-logo" />
          <div>
            <p className="eyebrow">Academic Excellence</p>
            <h1>CMS College of Engineering</h1>
          </div>
        </div>
      </header>

      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow accent">Admissions Open 2026</p>
          <h2>Begin your admission application.</h2>
          <div className="cta-row">
            <button type="button" className="primary-btn" onClick={() => navigate('/register')}>
              Register <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <aside className="qr-card" aria-label="Scan to open the admission application">
          <h3>Apply from your mobile</h3>
          <div className="qr-box">
            <QRCodeSVG
              className="admission-qr-code"
              value={registrationLink}
              size={180}
              level="H"
              marginSize={3}
              aria-label="QR code linking to the admission registration form"
            />
          </div>
          <p className="qr-note">Scan to open the admission form. For local demo, keep this computer and phone on the same Wi-Fi network.</p>
          <p className="qr-note"><strong>QR link:</strong> <code>{registrationLink}</code></p>
          <p className="qr-note"><strong>Demo:</strong> applications are currently saved in this browser only. Shared student/admin data requires the planned backend connection.</p>
        </aside>
      </section>
    </main>
  );
}
