import { Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import FileUploadField from '../components/FileUploadField';

export default function OfficerSettingsPage() {
  const {
    backgroundSettings,
    setBackgroundSettings,
    paymentSettings,
    setPaymentSettings,
  } = useAppContext();
  const [error, setError] = useState('');

  const handleVideoUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const isWebm = file.type === 'video/webm' || file.name.toLowerCase().endsWith('.webm');
    const isMp4 = file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4');
    if (!isMp4 && !isWebm) {
      setError('Only MP4 and WebM videos are supported in this demo.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Selected video is too large. Please keep it under 8 MB for frontend demo storage.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setBackgroundSettings({
        enabled: true,
        videoDataUrl: String(reader.result || ''),
        videoMimeType: isWebm ? 'video/webm' : 'video/mp4',
        playbackMode: 'muted',
      });
      setError('');
    };
    reader.onerror = () => setError(`Unable to read ${file.name}. Please choose another video.`);
    reader.readAsDataURL(file);
  };

  const handleToggle = (enabled) => {
    setBackgroundSettings((prev) => ({
      ...prev,
      enabled,
    }));
  };

  const clearVideo = () => {
    setBackgroundSettings((prev) => ({
      ...prev,
      videoDataUrl: '',
      videoMimeType: '',
      enabled: true,
    }));
    setError('');
  };

  return (
    <main className="page-shell admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <img src="/cms-logo.png" alt="CMS logo" className="brand-logo small" />
          <div>
            <p className="eyebrow accent">Settings</p>
            <strong>Campus background</strong>
          </div>
        </div>
        <nav className="admin-nav">
          <Link to="/officer/dashboard" className="nav-item">Dashboard</Link>
          <Link to="/officer/settings" className="nav-item active">Appearance</Link>
        </nav>
      </aside>

      <section className="admin-content">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow accent">Demo controls</p>
            <h2>Background video settings</h2>
          </div>
        </header>

        <div className="content-panel settings-panel">
          <div className="settings-grid">
            <div className="field-group">
              <label htmlFor="video-upload">{backgroundSettings.videoDataUrl ? 'Change campus video' : 'Upload a different campus video'}</label>
              <input id="video-upload" type="file" accept="video/mp4,video/webm" onChange={handleVideoUpload} />
              <small>Supported file types: MP4 and WebM. Maximum size: 8 MB. Your selection is saved in this browser; the supplied campus video remains the default.</small>
              {error ? <small className="error-text" role="alert">{error}</small> : null}
            </div>

            <div className="field-group toggle-group">
              <label>Enable background video</label>
              <button type="button" className="secondary-btn" onClick={() => handleToggle(!backgroundSettings.enabled)}>
                {backgroundSettings.enabled ? 'Video enabled' : 'Video disabled'}
              </button>
            </div>

            <div className="field-group toggle-group">
              <label>Fallback mode</label>
              <button type="button" className="secondary-btn" onClick={() => setBackgroundSettings((prev) => ({ ...prev, enabled: false }))}>
                Animated clouds fallback
              </button>
            </div>
          </div>

          <div className="video-preview-box">
            <video
              className="preview-video"
              src={backgroundSettings.videoDataUrl || '/campus-background.mp4'}
              controls
              muted
              autoPlay
              playsInline
              loop
            />
            <p className="video-settings-caption">
              {backgroundSettings.videoDataUrl ? 'Custom campus video selected.' : 'Supplied campus video is the default background.'}
            </p>
          </div>

          <div className="form-actions">
            <button type="button" className="secondary-btn" onClick={clearVideo}><Trash2 size={16} /> Use default campus video</button>
            <button type="button" className="primary-btn" onClick={() => window.alert('Settings saved in local browser storage.')}><Save size={16} /> Save settings</button>
          </div>
        </div>

        <div className="content-panel settings-panel payment-settings-panel">
          <div>
            <p className="eyebrow accent">College configuration</p>
            <h3>Admission payment details</h3>
            <p className="field-help">Configure the approved fee, UPI ID, payment QR image, and fee-structure document here. Payment is not processed or verified by this frontend demo.</p>
          </div>
          <div className="field-group">
            <label htmlFor="admission-fee">Admission fee amount (INR)</label>
            <input
              id="admission-fee"
              type="number"
              min="0"
              step="0.01"
              value={paymentSettings.feeAmount}
              onChange={(event) => setPaymentSettings((current) => ({ ...current, feeAmount: event.target.value }))}
            />
          </div>
          <div className="field-group">
            <label htmlFor="payment-upi-id">UPI ID</label>
            <input
              id="payment-upi-id"
              type="text"
              autoComplete="off"
              placeholder="name@bank"
              value={paymentSettings.upiId || ''}
              onChange={(event) => setPaymentSettings((current) => ({ ...current, upiId: event.target.value.trim() }))}
            />
          </div>
          <FileUploadField
            label="Payment QR code (optional)"
            imageOnly
            value={paymentSettings.paymentQrs?.[0] || paymentSettings.paymentQr || null}
            onChange={(qr) => setPaymentSettings((current) => ({ ...current, paymentQrs: [qr, null] }))}
          />
          <FileUploadField
            label="College fee structure (PDF or image)"
            value={paymentSettings.feeStructure}
            onChange={(feeStructure) => setPaymentSettings((current) => ({ ...current, feeStructure }))}
          />
          <small className="upload-storage-note">Fee, UPI ID, QR image, and fee structure are saved in this browser only. They are not a payment gateway or a verified payment record.</small>
        </div>
      </section>
    </main>
  );
}
