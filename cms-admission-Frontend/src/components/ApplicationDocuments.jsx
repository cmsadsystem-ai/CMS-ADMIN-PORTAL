import { useState } from 'react';
import { Eye, X } from 'lucide-react';

const documentLabels = {
  SSLC: 'SSLC Certificate',
  HSC: 'HSC Certificate',
  TC: 'Transfer Certificate (TC)',
  CC: 'Conduct Certificate (CC)',
  NativityCertificate: 'Nativity Certificate',
  IncomeCertificate: 'Income Certificate',
  AadhaarCard: 'Aadhaar Document',
  StudentPhoto: 'Student Photo',
  FirstGraduateCertificate: 'First Graduate Certificate',
  cashReceipt: 'Cash Bill / Receipt',
};

export default function ApplicationDocuments({
  documents = {},
  signature,
  studentSignature = signature,
  parentSignature,
}) {
  const [activePreview, setActivePreview] = useState(null);

  const uploadedDocuments = Object.entries(documents)
    .filter(([, file]) => file?.dataUrl)
    .map(([key, file]) => ({ key, label: documentLabels[key] || key, file }));
  const signatureFile = studentSignature || signature;
  const uploadedStudentSignature = signatureFile?.dataUrl ? signatureFile : null;
  const uploadedParentSignature = parentSignature?.dataUrl ? parentSignature : null;

  if (!uploadedDocuments.length && !uploadedStudentSignature && !uploadedParentSignature) return null;

  const files = [
    ...uploadedDocuments,
    ...(uploadedStudentSignature ? [{ key: 'student-signature', label: 'Student Signature', file: uploadedStudentSignature }] : []),
    ...(uploadedParentSignature ? [{ key: 'parent-signature', label: 'Parent Signature', file: uploadedParentSignature }] : []),
  ];

  return (
    <section className="document-review-block">
      <h3>Uploaded documents</h3>
      <div className="document-review-grid">
        {files.map(({ key, label, file }) => (
          <article className="document-review-item" key={key}>
            <strong>{label}</strong>
            <p className="document-name">{file.name}</p>
            {file.mimeType === 'application/pdf' ? (
              <iframe className="document-pdf-preview" src={file.dataUrl} title={`${label} preview`} />
            ) : (
              <img
                className="document-review-image"
                src={file.dataUrl}
                alt={`${label} preview`}
                style={{ transform: `rotate(${Number(file.rotation || 0)}deg)` }}
              />
            )}
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="secondary-btn compact"
                onClick={() => setActivePreview({ label, file })}
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              >
                <Eye size={14} /> View File
              </button>
            </div>
          </article>
        ))}
      </div>

      {activePreview ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activePreview.label}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setActivePreview(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <div>
                <strong style={{ fontSize: '1rem', color: '#1e293b' }}>{activePreview.label}</strong>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{activePreview.file.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setActivePreview(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close preview"
              >
                <X size={20} color="#334155" />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f1f5f9' }}>
              {activePreview.file.mimeType === 'application/pdf' ? (
                <iframe
                  src={activePreview.file.dataUrl}
                  title={activePreview.label}
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '6px' }}
                />
              ) : (
                <img
                  src={activePreview.file.dataUrl}
                  alt={activePreview.label}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    transform: `rotate(${Number(activePreview.file.rotation || 0)}deg)`,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
