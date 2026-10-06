import { COLORS } from './chartConfig';
import { fmtDelta, fmtInt, isFiniteNumber } from './format';

/** Dependency-free sparkline (cheaper than one Recharts instance per row). */
function MiniSpark({ series }) {
  const pts = series.map((v, i) => ({ i, v: isFiniteNumber(v) ? v : null })).filter((p) => p.v !== null);
  if (pts.length < 2) return <span className="ds-ranked__spark ds-ranked__spark--none" aria-hidden="true" />;
  const w = 72;
  const h = 22;
  const n = series.length - 1 || 1;
  const vs = pts.map((p) => p.v);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const span = hi - lo || 1;
  const x = (i) => 2 + (i / n) * (w - 4);
  const y = (v) => h - 3 - ((v - lo) / span) * (h - 6);
  const d = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg className="ds-ranked__spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={d} fill="none" stroke={COLORS.slate} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last.i)} cy={y(last.v)} r="2.2" fill={COLORS.slate} />
    </svg>
  );
}

/**
 * Ranked horizontal bars with a per-row sparkline and YoY delta. Rows are
 * sorted by value (descending); the top row is the single orange highlight.
 *
 * rows: [{ id, label, value, series: number[], delta }]
 */
export default function RankedBars({ rows = [], valueFormat = fmtInt, deltaLabel = 'YoY', maxRows }) {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const shown = maxRows ? sorted.slice(0, maxRows) : sorted;
  const max = shown.length ? Math.max(...shown.map((r) => r.value), 1) : 1;

  return (
    <ol className="ds-ranked" style={{ '--ds-rows': Math.max(1, Math.ceil(shown.length / 2)) }}>
      {shown.map((r, i) => {
        const good = isFiniteNumber(r.delta) ? r.delta > 0 : null;
        const tone = r.delta === 0 || good === null ? 'flat' : good ? 'up' : 'down';
        return (
          <li key={r.id ?? r.label} className="ds-ranked__row">
            <span className="ds-ranked__rank" aria-hidden="true">{i + 1}</span>
            <span className="ds-ranked__label" title={r.label}>{r.label}</span>
            <div className="ds-ranked__track">
              <div
                className={`ds-ranked__fill${i === 0 ? ' ds-ranked__fill--top' : ''}`}
                style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
              />
            </div>
            <span className="ds-ranked__val">{valueFormat(r.value)}</span>
            <MiniSpark series={r.series || []} />
            <span className={`ds-delta ds-delta--${tone} ds-ranked__delta`} title={`${deltaLabel} change`}>
              {isFiniteNumber(r.delta) ? (
                <>
                  <span aria-hidden="true">{r.delta > 0 ? '▲' : r.delta < 0 ? '▼' : '■'}</span>
                  {fmtDelta(r.delta)}
                </>
              ) : (
                '–'
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
