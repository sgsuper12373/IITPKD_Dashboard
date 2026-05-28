import { useEffect, useLayoutEffect, useCallback, useRef, useState, Children, isValidElement, cloneElement } from 'react';
import { createPortal } from 'react-dom';
import './ChartExpandModal.css';

function ChartExpandModal({ isOpen, onClose, title, children }) {
  const bodyRef = useRef(null);
  const [chartHeight, setChartHeight] = useState(500);

  const handleKey = useCallback(
    (e) => { if (e.key === 'Escape') onClose(); },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKey]);

  // Measure body height synchronously after layout so charts fill the available space.
  // useLayoutEffect fires before paint → no visible flash at wrong height.
  useLayoutEffect(() => {
    if (!isOpen || !bodyRef.current) return;

    const measure = () => {
      if (!bodyRef.current) return;
      // subtract top+bottom padding (20px each)
      const h = bodyRef.current.clientHeight - 40;
      if (h > 100) setChartHeight(h);
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(bodyRef.current);
    return () => ro.disconnect();
  }, [isOpen]);

  if (!isOpen) return null;

  // Inject the measured height into the direct child so every chart fills the modal.
  // - ResponsiveContainer (and similar): receives height as a prop
  // - Wrapper div (e.g. ias-expanded-chart): receives height via inline style so that
  //   inner ResponsiveContainer with height="100%" can resolve against a pixel value
  const enhancedChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (child.type === 'div') {
      return cloneElement(child, {
        style: { ...child.props.style, height: chartHeight },
      });
    }
    return cloneElement(child, { height: chartHeight });
  });

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

        {/* Chart content */}
        <div className="cem-body" ref={bodyRef}>
          {enhancedChildren}
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
