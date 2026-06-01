import { useState, useEffect, useRef } from 'react';
import './FeedbackModal.css';

const SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzDsrADgiedRvQ4N0qN9UBfB5FYPJrxNUvaiVG0fc0LeujplN0km05NrGGBK41YDSn9Yg/exec'

// Max screenshot size (the image is base64-encoded into the JSON payload, which
// inflates it by ~33%, so keep the raw file comfortably small).
const MAX_SCREENSHOT_MB = 5;

function FeedbackModal({ onClose, defaultName = '', defaultEmail = '' }) {
  const [form, setForm] = useState({
    name: defaultName,
    email: defaultEmail,
    feedback: '',
  });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  // Screenshot: { dataUrl, name, type } once a valid image is selected, else null.
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotError, setScreenshotError] = useState('');
  const firstInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Close on ESC
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus first input on mount
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleScreenshotChange = (e) => {
    setScreenshotError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setScreenshotError('Please select an image file.');
      setScreenshot(null);
      return;
    }
    if (file.size > MAX_SCREENSHOT_MB * 1024 * 1024) {
      setScreenshotError(`Image must be smaller than ${MAX_SCREENSHOT_MB} MB.`);
      setScreenshot(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot({ dataUrl: reader.result, name: file.name, type: file.type });
    };
    reader.onerror = () => setScreenshotError('Could not read the image. Try another file.');
    reader.readAsDataURL(file);
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      // Strip the "data:image/png;base64," prefix — Apps Script only needs the raw base64.
      const screenshotBase64 = screenshot
        ? String(screenshot.dataUrl).split(',')[1]
        : '';

      // Google Apps Script requires no-cors mode; response body is opaque but data is stored.
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          feedback: form.feedback.trim(),
          screenshot: screenshotBase64,
          screenshotName: screenshot?.name || '',
          screenshotType: screenshot?.type || '',
        }),
      });
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="fb-overlay" onClick={handleOverlayClick} aria-modal="true" role="dialog">
      <div className="fb-modal" aria-labelledby="fb-title">
        <div className="fb-modal-header">
          <h2 className="fb-title" id="fb-title">Share Your Feedback</h2>
          <button className="fb-close-btn" onClick={onClose} aria-label="Close feedback form">
            ✕
          </button>
        </div>

        {status === 'success' ? (
          <div className="fb-success-box">
            <div className="fb-success-icon" aria-hidden="true">✓</div>
            <p className="fb-success-title">Thank you!</p>
            <p className="fb-success-msg">Your feedback has been submitted successfully.</p>
            <button className="fb-submit-btn" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate={false}>
            <div className="fb-field">
              <label htmlFor="fb-name">Name</label>
              <input
                id="fb-name"
                ref={firstInputRef}
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your name (optional)"
                autoComplete="name"
              />
            </div>

            <div className="fb-field">
              <label htmlFor="fb-email">
                Email <span className="fb-required" aria-label="required">*</span>
              </label>
              <input
                id="fb-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="fb-field">
              <label htmlFor="fb-feedback">
                Feedback <span className="fb-required" aria-label="required">*</span>
              </label>
              <textarea
                id="fb-feedback"
                name="feedback"
                value={form.feedback}
                onChange={handleChange}
                placeholder="Tell us what you think, report an issue, or suggest an improvement…"
                required
                rows={5}
              />
            </div>

            <div className="fb-field">
              <label htmlFor="fb-screenshot">Screenshot <span className="fb-optional">(optional)</span></label>
              {!screenshot ? (
                <>
                  <input
                    id="fb-screenshot"
                    ref={fileInputRef}
                    type="file"
                    name="screenshot"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="fb-file-input"
                  />
                  <span className="fb-file-hint">PNG, JPG or GIF up to {MAX_SCREENSHOT_MB} MB.</span>
                </>
              ) : (
                <div className="fb-screenshot-preview">
                  <img src={screenshot.dataUrl} alt="Selected screenshot preview" />
                  <div className="fb-screenshot-meta">
                    <span className="fb-screenshot-name" title={screenshot.name}>{screenshot.name}</span>
                    <button type="button" className="fb-screenshot-remove" onClick={removeScreenshot}>
                      Remove
                    </button>
                  </div>
                </div>
              )}
              {screenshotError && (
                <span className="fb-error-msg" role="alert">{screenshotError}</span>
              )}
            </div>

            {status === 'error' && (
              <p className="fb-error-msg" role="alert">
                Something went wrong. Please try again.
              </p>
            )}

            <div className="fb-form-footer">
              <button
                type="submit"
                className="fb-submit-btn"
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? 'Submitting…' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default FeedbackModal;
