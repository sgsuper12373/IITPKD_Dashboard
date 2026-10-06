import { useRef } from 'react';

/**
 * Accessible single-choice segmented control (radio-group semantics with
 * roving tab stop and arrow-key navigation).
 *
 * options: [{ value, label }]
 */
export default function SegmentedControl({ label, options, value, onChange }) {
  const refs = useRef([]);
  const activeIdx = Math.max(0, options.findIndex((o) => o.value === value));

  const move = (idx) => {
    const next = (idx + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e, idx) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(idx + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(idx - 1); }
    else if (e.key === 'Home') { e.preventDefault(); move(0); }
    else if (e.key === 'End') { e.preventDefault(); move(options.length - 1); }
  };

  return (
    <div className="ds-seg" role="radiogroup" aria-label={label}>
      {options.map((o, i) => (
        <button
          key={String(o.value)}
          ref={(el) => { refs.current[i] = el; }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={i === activeIdx ? 0 : -1}
          className="ds-seg__btn"
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
