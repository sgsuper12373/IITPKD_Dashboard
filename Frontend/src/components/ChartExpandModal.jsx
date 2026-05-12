import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './ChartExpandModal.css';

/**
 * ChartExpandModal
 * ─────────────────────────────────────────────────────────────────
 * Fullscreen popup for charts, graphs, and tables.
 * Uses createPortal to ensure it renders at the root level.
 */
function ChartExpandModal({ isOpen, onClose, title, children }) {
  // Close on Escape key
  const handleKey = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKey);
    // Prevent body scroll while modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKey]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="cem-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Chart fullscreen view'}
    >
      <div className="cem-panel">
        {/* Header */}
        <div className="cem-header">
          <span className="cem-title">{title || 'Chart View'}</span>
          <button
            className="cem-close"
            onClick={onClose}
            aria-label="Close fullscreen view"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Chart content — children render at full modal size */}
        <div className="cem-body">
          {children}
        </div>

        {/* Footer hint */}
        <div className="cem-footer">
          Tap outside or press <kbd>Esc</kbd> to close
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ChartExpandModal;
