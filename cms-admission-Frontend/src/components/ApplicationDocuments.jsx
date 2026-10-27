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
};

export default function ApplicationDocuments({
  documents = {},
  signature,
  studentSignature = signature,
  parentSignature,
}) {
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
              <>
                <iframe className="document-pdf-preview" src={file.dataUrl} title={`${label} preview`} />
                <a className="document-open-link" href={file.dataUrl} target="_blank" rel="noreferrer">Open PDF in a new tab</a>
              </>
            ) : (
              <img
                className="document-review-image"
                src={file.dataUrl}
                alt={`${label} preview`}
                style={{ transform: `rotate(${Number(file.rotation || 0)}deg)` }}
              />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
