import { fmtNum, isFiniteNumber } from './format';

const clampPct = (n) => Math.min(100, Math.max(0, n));

/**
 * Labelled progress bar. `value` and `target` are on the same scale (`max`,
 * default 100). With a target the fill takes a status colour (success when the
 * target is met, warning from 80 % of it, danger below); without one it is slate,
 * or orange when `highlight` is set (one highlight per group).
 */
export default function ProgressRow({ label, value, target, max = 100, highlight = false, suffix = '%', sub }) {
  const has = isFiniteNumber(value);
  const pct = has ? clampPct((value / max) * 100) : 0;
  const targetPct = isFiniteNumber(target) ? clampPct((target / max) * 100) : null;

  let tone = highlight ? 'accent' : 'slate';
  if (has && targetPct !== null) {
    tone = pct >= targetPct ? 'success' : pct >= targetPct * 0.8 ? 'warning' : 'danger';
  }

  return (
    <div className="ds-progress">
      <div className="ds-progress__head">
        <span className="ds-label">{label}</span>
        <span className="ds-progress__val">{has ? `${fmtNum(value, 1)}${suffix}` : '–'}</span>
      </div>
      <div
        className="ds-progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={has ? value : undefined}
      >
        <div className={`ds-progress__fill ds-progress__fill--${tone}`} style={{ width: `${pct}%` }} />
        {targetPct !== null && <span className="ds-progress__target" style={{ left: `${targetPct}%` }} title={`Target ${fmtNum(target, 1)}${suffix}`} />}
      </div>
      {sub && <span className="ds-progress__sub">{sub}</span>}
    </div>
  );
}
