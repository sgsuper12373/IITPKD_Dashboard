import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './TruncateConfirmModal.css';

const API_EXPORT_URL = `${import.meta.env.VITE_API_BASE_URL}/api/export`;

function TruncateConfirmModal({ isOpen, onClose, tableName, token, onTruncateSuccess, onExportFirst }) {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captcha, setCaptcha] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const generateCaptcha = useCallback(() => {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * 3)];
    const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
    setCaptcha({ a, b, op, answer });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPassword('');
      setCaptchaInput('');
      setError('');
      generateCaptcha();
    }
  }, [isOpen, generateCaptcha]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleTruncate = async () => {
    setError('');

    if (parseInt(captchaInput, 10) !== captcha.answer) {
      setError('Incorrect answer. Please try again.');
      generateCaptcha();
      setCaptchaInput('');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_EXPORT_URL}/truncate/${tableName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Truncation failed');
      onTruncateSuccess(tableName);
      onClose();
    } catch (err) {
      setError(err.message);
      generateCaptcha();
      setCaptchaInput('');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !tableName) return null;

  return createPortal(
    <div className="truncate-overlay" onClick={onClose}>
      <div className="truncate-modal" onClick={(e) => e.stopPropagation()}>

        {step === 1 && (
          <>
            <div className="truncate-header truncate-header-warning">
              <span className="truncate-header-icon">⚠</span>
              <h2>Destructive Action Warning</h2>
            </div>

            <div className="truncate-body">
              <div className="truncate-danger-banner">
                <strong>WARNING:</strong> You are about to permanently delete ALL data in the table{' '}
                <code className="truncate-table-name">{tableName}</code>.
                This action <strong>cannot be undone</strong>.
              </div>

              <div className="truncate-suggestion-banner">
                <span className="truncate-suggestion-icon">💡</span>
                <div>
                  <strong>Recommendation:</strong> Export the table data as a CSV backup before truncating.
                  Use the button below to download a copy first.
                </div>
              </div>

              <div className="truncate-step1-actions">
                <button
                  className="truncate-btn truncate-btn-export"
                  onClick={() => onExportFirst(tableName)}
                >
                  Export Table First
                </button>
                <div className="truncate-step1-right">
                  <button className="truncate-btn truncate-btn-cancel" onClick={onClose}>
                    Cancel
                  </button>
                  <button
                    className="truncate-btn truncate-btn-proceed"
                    onClick={() => setStep(2)}
                  >
                    I Understand, Proceed
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="truncate-header truncate-header-danger">
              <span className="truncate-header-icon">🗑</span>
              <h2>Confirm Truncation</h2>
            </div>

            <div className="truncate-body">
              <p className="truncate-confirm-label">
                You are truncating: <code className="truncate-table-name">{tableName}</code>
              </p>

              {error && <div className="truncate-error">{error}</div>}

              <div className="truncate-field">
                <label className="truncate-label">Admin Password</label>
                <input
                  type="password"
                  className="truncate-input"
                  placeholder="Enter your admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && captchaInput) handleTruncate(); }}
                />
              </div>

              <div className="truncate-field">
                <label className="truncate-label">Bot Verification</label>
                <div className="truncate-captcha-box">
                  <span className="truncate-captcha-challenge">
                    Solve to verify: <strong>{captcha?.a} {captcha?.op} {captcha?.b} = ?</strong>
                  </span>
                  <input
                    type="number"
                    className="truncate-input truncate-captcha-input"
                    placeholder="Answer"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && password) handleTruncate(); }}
                  />
                </div>
              </div>

              <div className="truncate-step2-actions">
                <button className="truncate-btn truncate-btn-cancel" onClick={onClose}>
                  Cancel
                </button>
                <button className="truncate-btn truncate-btn-back" onClick={() => { setStep(1); setError(''); }}>
                  Go Back
                </button>
                <button
                  className="truncate-btn truncate-btn-danger"
                  onClick={handleTruncate}
                  disabled={isLoading || !password || !captchaInput}
                >
                  {isLoading ? 'Truncating…' : 'Truncate Table'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

export default TruncateConfirmModal;
