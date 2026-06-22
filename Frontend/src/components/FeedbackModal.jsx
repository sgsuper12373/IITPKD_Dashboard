import { useState, useEffect, useRef } from 'react';
import './FeedbackModal.css';

// Feedback now goes through the Flask backend (Browser → Flask → Apps Script → Sheet)
// so the server can verify an email OTP + math CAPTCHA and sanitise the screenshot
// before anything reaches the sheet. The old direct Apps Script URL is gone.
const API_FEEDBACK_URL = `${import.meta.env.VITE_API_BASE_URL}/api/feedback`;

// Server re-validates this; the client check is a fast UX guard, not security.
const MAX_SCREENSHOT_MB = 5;
const ALLOWED_TYPES = ['image/png', 'image/jpeg'];

function FeedbackModal({ onClose, defaultName = '', defaultEmail = '' }) {
  // step: 'loading' (requesting OTP) | 'verify' | 'details' | 'success'
  const [step, setStep] = useState('loading');

  // Verification state issued by POST /start.
  const [verificationId, setVerificationId] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [email, setEmail] = useState(defaultEmail);

  // User inputs for the verification step (kept around — /submit re-checks them).
  const [otp, setOtp] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  // Feedback details.
  const [form, setForm] = useState({ name: defaultName, feedback: '' });
  const [screenshot, setScreenshot] = useState(null); // { dataUrl, name, type } | null
  const [screenshotError, setScreenshotError] = useState('');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  const fileInputRef = useRef(null);
  const token = localStorage.getItem('authToken');

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // Request an OTP as soon as the modal opens.
  const requestOtp = async () => {
    setError('');
    try {
      const res = await fetch(`${API_FEEDBACK_URL}/start`, { method: 'POST', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not start verification.');
      setVerificationId(data.verification_id);
      setCaptchaQuestion(data.captcha_question);
      setEmail(data.email || defaultEmail);
      setStep('verify');
    } catch (err) {
      setError(err.message);
      setStep('verify'); // surface the error with a Retry control
    }
  };

  useEffect(() => {
    requestOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on ESC
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      const res = await fetch(`${API_FEEDBACK_URL}/start`, { method: 'POST', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not resend the code.');
      setVerificationId(data.verification_id);
      setCaptchaQuestion(data.captcha_question);
      setEmail(data.email || email);
      setOtp('');
      setCaptchaAnswer('');
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API_FEEDBACK_URL}/verify`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ verification_id: verificationId, otp: otp.trim(), captcha_answer: captchaAnswer.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed.');
      setStep('details');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleScreenshotChange = (e) => {
    setScreenshotError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setScreenshotError('Only JPG or PNG images are allowed.');
      setScreenshot(null);
      return;
    }
    if (file.size > MAX_SCREENSHOT_MB * 1024 * 1024) {
      setScreenshotError(`Image must be smaller than ${MAX_SCREENSHOT_MB} MB.`);
      setScreenshot(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setScreenshot({ dataUrl: reader.result, name: file.name, type: file.type });
    reader.onerror = () => setScreenshotError('Could not read the image. Try another file.');
    reader.readAsDataURL(file);
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      // Strip the "data:image/png;base64," prefix — the server wants raw base64.
      const screenshotBase64 = screenshot ? String(screenshot.dataUrl).split(',')[1] : '';
      const res = await fetch(`${API_FEEDBACK_URL}/submit`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          verification_id: verificationId,
          otp: otp.trim(),
          captcha_answer: captchaAnswer.trim(),
          name: form.name.trim(),
          feedback: form.feedback.trim(),
          screenshot: screenshotBase64,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not submit feedback.');
      setStep('success');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="fb-overlay" onClick={handleOverlayClick} aria-modal="true" role="dialog">
      <div className="fb-modal" aria-labelledby="fb-title">
        <div className="fb-modal-header">
          <h2 className="fb-title" id="fb-title">Share Your Feedback</h2>
          <button className="fb-close-btn" onClick={onClose} aria-label="Close feedback form">✕</button>
        </div>

        {/* ── Loading: requesting OTP ── */}
        {step === 'loading' && (
          <p className="fb-step-hint">Sending a verification code to your email…</p>
        )}

        {/* ── Step 1: verify OTP + CAPTCHA ── */}
        {step === 'verify' && (
          <form onSubmit={handleVerify}>
            <p className="fb-step-hint">
              Step 1 of 2 — We emailed a 6-digit code to <strong>{email}</strong>.
              Enter it below and solve the CAPTCHA to continue.
            </p>

            <div className="fb-field">
              <label htmlFor="fb-otp">Email code <span className="fb-required" aria-label="required">*</span></label>
              <input
                id="fb-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                required
              />
            </div>

            <div className="fb-field">
              <label htmlFor="fb-captcha">
                CAPTCHA: what is <span className="fb-captcha-question">{captchaQuestion || '…'}</span>?
                <span className="fb-required" aria-label="required">*</span>
              </label>
              <input
                id="fb-captcha"
                type="text"
                inputMode="numeric"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                placeholder="Your answer"
                required
              />
            </div>

            {error && <p className="fb-error-msg" role="alert">{error}</p>}

            <div className="fb-btn-row">
              <button
                type="button"
                className="fb-link-btn"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? 'Resending…' : 'Resend code'}
              </button>
              <button type="submit" className="fb-submit-btn" disabled={busy || !verificationId}>
                {busy ? 'Verifying…' : 'Verify'}
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2: feedback details ── */}
        {step === 'details' && (
          <form onSubmit={handleSubmit}>
            <p className="fb-step-hint">Step 2 of 2 — Verified. Tell us what you think.</p>

            <div className="fb-field">
              <label htmlFor="fb-name">Name</label>
              <input
                id="fb-name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your name (optional)"
                autoComplete="name"
              />
            </div>

            <div className="fb-field">
              <label htmlFor="fb-email">Email</label>
              <input id="fb-email" type="email" value={email} readOnly className="fb-readonly-input" />
            </div>

            <div className="fb-field">
              <label htmlFor="fb-feedback">Feedback <span className="fb-required" aria-label="required">*</span></label>
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
                    accept="image/png,image/jpeg"
                    onChange={handleScreenshotChange}
                    className="fb-file-input"
                  />
                  <span className="fb-file-hint">PNG or JPG only, up to {MAX_SCREENSHOT_MB} MB.</span>
                </>
              ) : (
                <div className="fb-screenshot-preview">
                  <img src={screenshot.dataUrl} alt="Selected screenshot preview" />
                  <div className="fb-screenshot-meta">
                    <span className="fb-screenshot-name" title={screenshot.name}>{screenshot.name}</span>
                    <button type="button" className="fb-screenshot-remove" onClick={removeScreenshot}>Remove</button>
                  </div>
                </div>
              )}
              {screenshotError && <span className="fb-error-msg" role="alert">{screenshotError}</span>}
            </div>

            {error && <p className="fb-error-msg" role="alert">{error}</p>}

            <div className="fb-form-footer">
              <button type="submit" className="fb-submit-btn" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}

        {/* ── Success ── */}
        {step === 'success' && (
          <div className="fb-success-box">
            <div className="fb-success-icon" aria-hidden="true">✓</div>
            <p className="fb-success-title">Thank you!</p>
            <p className="fb-success-msg">Your feedback has been submitted successfully.</p>
            <button className="fb-submit-btn" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FeedbackModal;
