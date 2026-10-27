import { Camera, Eye, FileUp, ImagePlus, RotateCw, Trash2, X } from 'lucide-react';
import { useState } from 'react';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}. Please try another file.`));
    reader.readAsDataURL(file);
  });
}

export default function FileUploadField({
  label,
  value,
  onChange,
  signature = false,
  imageOnly = false,
  existingFiles = [],
}) {
  const [error, setError] = useState('');
  const [isViewing, setIsViewing] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [cropSettings, setCropSettings] = useState({ zoom: 1, x: 0, y: 0 });

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isImage && (signature || imageOnly || !isPdf)) {
      setError(signature || imageOnly ? 'Choose an image file.' : 'Choose an image or PDF file.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Files must be 5 MB or smaller in this frontend demo.');
      return;
    }

    try {
      const dataUrl = await readAsDataUrl(file);

      // Duplicate upload prevention: Compare content/dataUrl against other uploaded files for this application
      const isDuplicate = existingFiles.some((existing) => {
        if (!existing || !existing.dataUrl) return false;
        // If it's the exact same file currently assigned to this field, allow it
        if (value?.dataUrl && existing.dataUrl === value.dataUrl) return false;
        return existing.dataUrl === dataUrl;
      });

      if (isDuplicate) {
        setError('Duplicate file detected. This document/file content has already been uploaded for this application.');
        return;
      }

      onChange({
        name: file.name,
        mimeType: isPdf ? 'application/pdf' : file.type,
        dataUrl,
        rotation: 0,
      });
      setCropSettings({ zoom: 1, x: 0, y: 0 });
      setIsCropping(false);
      setError('');
    } catch (readError) {
      setError(readError.message);
    }
  };

  const rotatePreview = () => {
    onChange({ ...value, rotation: (Number(value.rotation || 0) + 90) % 360 });
  };

  const applyCrop = async () => {
    try {
      const image = new Image();
      image.src = value.dataUrl;
      await image.decode();

      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 1125;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image cropping is unavailable in this browser.');

      const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) * cropSettings.zoom;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.translate(
        canvas.width / 2 + (cropSettings.x / 100) * canvas.width,
        canvas.height / 2 + (cropSettings.y / 100) * canvas.height,
      );
      context.rotate((Number(value.rotation || 0) * Math.PI) / 180);
      context.scale(scale, scale);
      context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

      onChange({
        ...value,
        name: `${value.name.replace(/\.[^.]+$/, '')}-cropped.jpg`,
        mimeType: 'image/jpeg',
        dataUrl: canvas.toDataURL('image/jpeg', 0.9),
        rotation: 0,
      });
      setIsCropping(false);
      setCropSettings({ zoom: 1, x: 0, y: 0 });
      setError('');
    } catch (cropError) {
      setError(cropError.message || 'Unable to crop this image in the current browser.');
    }
  };

  return (
    <div className="upload-field">
      <strong className="upload-title">{label}</strong>
      <div className="upload-actions">
        <label className="upload-action">
          <Camera size={17} /> Take photo
          <input className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
        </label>
        <label className="upload-action">
          <ImagePlus size={17} /> Choose image
          <input className="visually-hidden" type="file" accept="image/*" onChange={handleFileChange} />
        </label>
        {!signature && !imageOnly ? (
          <label className="upload-action">
            <FileUp size={17} /> Choose PDF
            <input className="visually-hidden" type="file" accept="application/pdf,.pdf" onChange={handleFileChange} />
          </label>
        ) : null}
      </div>

      {error ? <small className="error-text" role="alert">{error}</small> : null}

      {value?.dataUrl ? (
        <div className="document-preview">
          <p className="document-name">{value.name}</p>
          {value.mimeType === 'application/pdf' ? (
            <>
              <iframe className="document-pdf-preview" src={value.dataUrl} title={`${label} document preview`} />
              <a className="document-open-link" href={value.dataUrl} target="_blank" rel="noreferrer">Open PDF in a new tab</a>
            </>
          ) : (
            <div className="document-image-viewport">
              <img
                className="document-image-preview"
                src={value.dataUrl}
                alt={`${label} preview`}
                style={{ transform: `rotate(${Number(value.rotation || 0)}deg)` }}
              />
            </div>
          )}
          {isCropping && value.mimeType !== 'application/pdf' ? (
            <div className="crop-editor">
              <div className="document-crop-viewport">
                <img
                  src={value.dataUrl}
                  alt={`${label} crop area`}
                  style={{
                    transform: `translate(${cropSettings.x}%, ${cropSettings.y}%) rotate(${Number(value.rotation || 0)}deg) scale(${cropSettings.zoom})`,
                  }}
                />
              </div>
              <label className="crop-control">
                Zoom
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={cropSettings.zoom}
                  onChange={(event) => setCropSettings((current) => ({ ...current, zoom: Number(event.target.value) }))}
                />
              </label>
              <label className="crop-control">
                Horizontal position
                <input
                  type="range"
                  min="-40"
                  max="40"
                  value={cropSettings.x}
                  onChange={(event) => setCropSettings((current) => ({ ...current, x: Number(event.target.value) }))}
                />
              </label>
              <label className="crop-control">
                Vertical position
                <input
                  type="range"
                  min="-40"
                  max="40"
                  value={cropSettings.y}
                  onChange={(event) => setCropSettings((current) => ({ ...current, y: Number(event.target.value) }))}
                />
              </label>
              <div className="upload-actions">
                <button type="button" className="primary-btn compact" onClick={applyCrop}>Apply crop</button>
                <button type="button" className="secondary-btn compact" onClick={() => setIsCropping(false)}>Cancel crop</button>
              </div>
            </div>
          ) : null}
          <div className="upload-actions">
            <button
              type="button"
              className="secondary-btn compact"
              onClick={() => setIsViewing(true)}
            >
              <Eye size={16} /> View File
            </button>
            {value.mimeType !== 'application/pdf' ? (
              <>
                <button type="button" className="secondary-btn compact" onClick={rotatePreview}>
                  <RotateCw size={16} /> Rotate
                </button>
                <button type="button" className="secondary-btn compact" onClick={() => setIsCropping((current) => !current)}>
                  Crop
                </button>
              </>
            ) : null}
            <button type="button" className="secondary-btn compact" onClick={() => onChange(null)}>
              <Trash2 size={16} /> Remove
            </button>
          </div>
        </div>
      ) : null}

      {isViewing && value?.dataUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
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
          onClick={() => setIsViewing(false)}
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
                <strong style={{ fontSize: '1rem', color: '#1e293b' }}>{label}</strong>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{value.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsViewing(false)}
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
              {value.mimeType === 'application/pdf' ? (
                <iframe
                  src={value.dataUrl}
                  title={label}
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '6px' }}
                />
              ) : (
                <img
                  src={value.dataUrl}
                  alt={label}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    transform: `rotate(${Number(value.rotation || 0)}deg)`,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
