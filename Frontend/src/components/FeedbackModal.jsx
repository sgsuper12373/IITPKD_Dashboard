import { useState, useEffect, useRef } from 'react';
import './FeedbackModal.css';

const SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyCyLF4v2BCnFn1AVmyusLZ4pYHZ8ISAiM9Im53N1VmVc-J8yr8TIz8D8Ab0oKcDhXA5Q/exec';

function FeedbackModal({ onClose, defaultName = '', defaultEmail = '' }) {
  const [form, setForm] = useState({
    name: defaultName,
    email: defaultEmail,
    feedback: '',
  });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const firstInputRef = useRef(null);

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

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      // Google Apps Script requires no-cors mode; response body is opaque but data is stored.
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          feedback: form.feedback.trim(),
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
