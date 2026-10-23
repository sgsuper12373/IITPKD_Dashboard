import { useEffect, useId, useMemo, useState } from 'react';
import { COLORS, ANIMATION } from './chartConfig';
import { useElementSize } from './hooks';
import { fmtDelta, fmtNum, isFiniteNumber } from './format';

const N = 30;
const GAP = 1.8;
const ARC = (180 - GAP * (N - 1)) / N;

function arcSeg(cx, cy, ro, ri, a0, a1) {
  const r = (d) => (d * Math.PI) / 180;
  const [ca, sa] = [Math.cos(r(a0)), Math.sin(r(a0))];
  const [cb, sb] = [Math.cos(r(a1)), Math.sin(r(a1))];
  return `M${cx + ro * ca},${cy - ro * sa}A${ro},${ro} 0 0,1 ${cx + ro * cb},${cy - ro * sb}L${cx + ri * cb},${cy - ri * sb}A${ri},${ri} 0 0,0 ${cx + ri * ca},${cy - ri * sa}Z`;
}

export default function VuMeter({
  value,
  display,
  min = 0,
  max = 100,
  invert = false,
  bands = [0.4, 0.7],
  label,
  sub,
  delta,
  deltaUnit = '%',
  deltaLabel = 'YoY',
  format = (v) => fmtNum(v, 1),
}) {
  const uid = useId().replace(/:/g, '');
  const [ref, { width }] = useElementSize();
  const [armed, setArmed] = useState(false);
  const hasValue = isFiniteNumber(value) && max > min;

  useEffect(() => {
    const id = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const frac = hasValue ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const goodness = invert ? 1 - frac : frac;
  const status = !hasValue ? 'none'
    : goodness >= bands[1] ? 'success' : goodness >= bands[0] ? 'warning' : 'danger';
  const lit = armed ? Math.round(frac * N) : 0;

  const segs = useMemo(() => {
    const [lo, hi] = bands;
    return Array.from({ length: N }, (_, i) => {
      const g = invert ? 1 - (i + 0.5) / N : (i + 0.5) / N;
      return {
        c: g >= hi ? COLORS.success : g >= lo ? COLORS.warning : COLORS.danger,
        a0: 180 - i * (ARC + GAP),
        a1: 180 - i * (ARC + GAP) - ARC,
      };
    });
  }, [bands, invert]);

  const w = Math.max(Math.floor(width), 0);
  const pad = 10;
  const R = Math.max(0, w / 2 - pad);
  const cx = w / 2;
  const cy = R + pad;
  const ri = R * 0.68;
  const h = Math.ceil(cy + 22);
  const nL = R * 0.86;
  const nDeg = (armed ? frac : 0) * 180;

  const deltaGood = isFiniteNumber(delta) ? (invert ? delta < 0 : delta > 0) : null;
  const dTone = delta === 0 || deltaGood === null ? 'flat' : deltaGood ? 'up' : 'down';
  const txt = display ?? (hasValue ? format(value) : '–');

  return (
    <div className="vu">
      <div className="vu__plot" ref={ref} style={{ height: w ? h : undefined }}>
        {w > 0 && R > 0 && (
          <svg width={w} height={h} role="img" aria-label={`${label}: ${txt}`}>
            <defs>
              <filter id={`vg${uid}`} x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" />
              </filter>
              <radialGradient id={`vh${uid}`} cx="38%" cy="30%">
                <stop offset="0%" stopColor="#e0e0e0" />
                <stop offset="50%" stopColor="#a0a0a0" />
                <stop offset="100%" stopColor="#505050" />
              </radialGradient>
              <linearGradient id={`vn${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#eee" />
                <stop offset="100%" stopColor="#888" />
              </linearGradient>
            </defs>

            {/* Track background */}
            <path d={arcSeg(cx, cy, R + 1, ri - 1, 179.9, 0.1)} fill="var(--ds-slate-06)" />

            {/* Glow layer behind lit segments */}
            <g filter={`url(#vg${uid})`} className="vu__glow" opacity={lit > 0 ? 0.45 : 0}>
              {segs.map((s, i) =>
                i < lit ? <path key={i} d={arcSeg(cx, cy, R, ri, s.a0, s.a1)} fill={s.c} /> : null,
              )}
            </g>

            {/* LED segments */}
            {segs.map((s, i) => (
              <path
                key={i}
                d={arcSeg(cx, cy, R, ri, s.a0, s.a1)}
                fill={s.c}
                opacity={i < lit ? 0.95 : 0.08}
                className="vu__seg"
                style={{ transitionDelay: i < lit ? `${i * 22}ms` : '0ms' }}
              />
            ))}

            {/* Scale labels */}
            <text x={pad + 2} y={cy + 15} textAnchor="start" className="vu__tick">{format(min)}</text>
            <text x={w - pad - 2} y={cy + 15} textAnchor="end" className="vu__tick">{format(max)}</text>

            {/* Needle with shadow */}
            {hasValue && (
              <g className="vu__needle" style={{
                transformOrigin: `${cx}px ${cy}px`,
                transform: `rotate(${nDeg}deg)`,
              }}>
                <polygon
                  points={`${cx - nL},${cy} ${cx - 8},${cy - 3.5} ${cx + 7},${cy} ${cx - 8},${cy + 3.5}`}
                  fill="rgba(0,0,0,0.15)"
                  transform="translate(1,1.5)"
                />
                <polygon
                  points={`${cx - nL},${cy} ${cx - 8},${cy - 3.5} ${cx + 7},${cy} ${cx - 8},${cy + 3.5}`}
                  fill={`url(#vn${uid})`}
                  stroke="rgba(0,0,0,0.1)"
                  strokeWidth="0.5"
                />
              </g>
            )}

            {/* Chrome hub */}
            <circle cx={cx} cy={cy} r={9} fill={`url(#vh${uid})`} stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
            <circle cx={cx - 2} cy={cy - 2} r={3} fill="rgba(255,255,255,0.2)" />
          </svg>
        )}
      </div>

      <div className="vu__read">
        <span className="ds-label">{label}</span>
        <span className={`vu__val vu__val--${status}`}>{txt}</span>
        {sub && <span className="vu__sub">{sub}</span>}
        {isFiniteNumber(delta) && (
          <span className={`ds-delta ds-delta--${dTone}`}>
            <span aria-hidden="true">{delta > 0 ? '▲' : delta < 0 ? '▼' : '■'}</span>
            {fmtDelta(delta, deltaUnit)} <span className="ds-delta__tag">{deltaLabel}</span>
          </span>
        )}
      </div>
    </div>
  );
}
