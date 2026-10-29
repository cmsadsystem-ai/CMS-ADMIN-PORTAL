import { Camera, ImagePlus, RotateCcw, Check, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export default function SignaturePadBox({
  title,
  value,
  onChange,
  error,
  required = true,
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [fileError, setFileError] = useState('');

  // Setup canvas resolution and drawing context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-DPI scaling for sharp signatures on kiosks and retina screens
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = rect.width || 420;
    const displayHeight = 150;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;

    // If an existing drawn signature is provided as dataUrl and not in uploaded-image mode
    if (value?.dataUrl && !value.isUploadedImage) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
        setHasDrawn(true);
      };
      img.src = value.dataUrl;
    }
  }, [value?.isUploadedImage]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
    setFileError('');
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    onChange({
      name: `${title.toLowerCase().replace(/\s+/g, '-')}.png`,
      mimeType: 'image/png',
      dataUrl,
      isUploadedImage: false,
    });
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, 150);
      }
    }
    setHasDrawn(false);
    setFileError('');
    onChange(null);
  };

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFileError('Please choose a valid signature image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError('Signature file must be 5 MB or smaller.');
      return;
    }

    try {
      const dataUrl = await readAsDataUrl(file);
      onChange({
        name: file.name,
        mimeType: file.type,
        dataUrl,
        isUploadedImage: true,
      });
      setHasDrawn(true);
      setFileError('');
    } catch (err) {
      setFileError(err.message || 'Failed to read signature image.');
    }
  };

  const isSigned = Boolean(value?.dataUrl);

  return (
    <div className="signature-box-card">
      <div className="signature-box-header">
        <label className="signature-box-label">
          {title} {required ? <span className="required-indicator" style={{ color: '#006747' }}>*</span> : null}
        </label>
        {isSigned ? (
          <span className="signature-badge signed">
            <Check size={13} /> {value.isUploadedImage ? 'Image Attached' : 'Signed'}
          </span>
        ) : (
          <span className="signature-badge pending">Sign with finger/stylus or upload</span>
        )}
      </div>

      <div className="signature-canvas-container">
        {value?.isUploadedImage && value?.dataUrl ? (
          <div className="signature-image-view">
            <img src={value.dataUrl} alt={`${title} preview`} className="signature-preview-img" />
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              className="signature-canvas"
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
              style={{ touchAction: 'none' }}
              aria-label={`${title} drawing area. Use stylus or finger to sign.`}
            />
            {!hasDrawn && !isSigned ? (
              <div className="signature-hint-watermark" aria-hidden="true">
                <Sparkles size={16} /> Draw signature here (Touchscreen / Stylus / Mouse)
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="signature-toolbar">
        <label className="secondary-btn compact signature-tool-btn" title="Take a photo of your signature">
          <Camera size={14} /> Take Photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="visually-hidden"
            onChange={handleImageFile}
          />
        </label>

        <label className="secondary-btn compact signature-tool-btn" title="Choose a signature image file">
          <ImagePlus size={14} /> Choose/Take Image
          <input
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={handleImageFile}
          />
        </label>

        {isSigned || hasDrawn ? (
          <button
            type="button"
            className="secondary-btn compact signature-tool-btn danger"
            onClick={clearSignature}
            title="Clear signature to sign again"
          >
            <RotateCcw size={14} /> Clear
          </button>
        ) : null}
      </div>

      {fileError ? <small className="error-text" role="alert">{fileError}</small> : null}
      {error ? <small className="error-text" role="alert">{error}</small> : null}
    </div>
  );
}
