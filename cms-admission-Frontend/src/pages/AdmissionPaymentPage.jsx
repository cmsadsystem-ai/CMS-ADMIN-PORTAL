import { ArrowLeft, Check, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { QRCodeSVG } from 'qrcode.react';
import { formatCurrency } from '../utils/helpers';

const DEMO_PAYMENT_QR_VALUE = 'CMS ADMISSION PAYMENT DEMO ONLY - NO PAYMENT ADDRESS';

export default function AdmissionPaymentPage() {
  const navigate = useNavigate();
  const { draft, paymentSettings, submitApplication } = useAppContext();
  const paymentQr = paymentSettings.paymentQrs?.[0] || paymentSettings.paymentQr || null;

  const handleConfirm = () => {
    const application = submitApplication({
      ...draft,
      admissionFeeAmount: 5000,
      paymentStatus: 'Unpaid',
    });
    navigate(`/application-success?id=${encodeURIComponent(application.id)}`);
  };

  return (
    <main className="page-shell payment-shell" style={{ background: 'transparent' }}>
      <section className="content-panel payment-panel" style={{ background: 'rgba(255,255,255,0.28)', backdropFilter: 'blur(2px)', border: '1px solid rgba(255,255,255,0.35)', boxShadow: 'none' }}>
        <div className="section-header">
          <div>
            <p className="eyebrow accent">Admission Payment</p>
            <h2>Seat confirmation payment</h2>
          </div>
          <img src="/cms-logo.png" alt="CMS College of Engineering logo" className="brand-logo small" />
        </div>

        <div className="payment-meta">
          <div style={{ background: 'rgba(255,255,255,0.38)' }}><span>Application reference</span><strong>{draft.formNumber || 'Not available'}</strong></div>
          <div style={{ background: 'rgba(255,255,255,0.38)' }}><span>Admission fee</span><strong>{formatCurrency(5000)}</strong></div>
        </div>

        <section className="payment-qr-section" style={{ background: 'rgba(255,255,255,0.38)' }}>
          <h3>Payment QR code</h3>
          {paymentQr?.dataUrl ? (
            <img className="payment-qr-image" src={paymentQr.dataUrl} alt="College payment QR code" />
          ) : (
            <QRCodeSVG
              className="payment-qr-image"
              size={240}
              value={DEMO_PAYMENT_QR_VALUE}
              level="H"
              marginSize={4}
              bgColor="#fff"
              fgColor="#004D38"
              aria-label="Demo-only QR code; does not initiate a payment"
            />
          )}
          <p>{paymentQr?.dataUrl ? 'QR image configured by the college.' : 'Demo placeholder only; no payment destination is configured.'}</p>
          <p className="payment-upi-id"><strong>UPI ID:</strong> <code>{paymentSettings.upiId || 'Not configured'}</code></p>
          <p>Scanning a demo placeholder does not send money or notify the college. Payments are not processed or verified on this page.</p>
        </section>

        <section className="payment-status" aria-live="polite" style={{ background: 'rgba(255,255,255,0.38)' }}>
          <h3><CreditCard size={18} /> Payment status</h3>
          <strong>Frontend demo — payment is not connected or verified.</strong>
          <p>No payment has been received. This application will not be marked paid or confirmed on this page.</p>
          <p>If the final admission fee has not been paid, Confirm submits the application to the Enquiring list for follow-up.</p>
        </section>

        <div className="form-actions">
          <button type="button" className="secondary-btn" onClick={() => navigate('/application-preview')}>
            <ArrowLeft size={16} /> Previous
          </button>
          <button type="button" className="primary-btn" onClick={handleConfirm}>
            <Check size={16} /> Confirm
          </button>
        </div>
      </section>
    </main>
  );
}
