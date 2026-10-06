import { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { COLORS, GAUGE_BANDS, ANIMATION, animationProps } from './chartConfig';
import { useElementSize } from './hooks';
import { fmtDelta, fmtNum, isFiniteNumber } from './format';

const clamp01 = (n) => Math.min(1, Math.max(0, n));

/**
 * Semicircle speedometer: Recharts PieChart (startAngle 180 → endAngle 0) for
 * the danger / warning / success zones plus an SVG needle.
 *
 * bands  [lower, upper] on a 0–1 goodness scale (see GAUGE_BANDS).
 * invert true when lower is better (NIRF rank, energy per capita): the zones
 *        flip so the success zone sits at the low end of the scale.
 * delta  year-on-year change; its colour follows `invert` (a rising rank is bad).
 */
export default function GaugeChart({
  value,
  min = 0,
  max = 100,
  invert = false,
  bands = GAUGE_BANDS.default,
  target,
  label,
  sub,
  delta,
  deltaUnit = '%',
  deltaLabel = 'YoY',
  format = (v) => fmtNum(v, 1),
}) {
  const [ref, { width }] = useElementSize();
  const [armed, setArmed] = useState(false);
  const hasValue = isFiniteNumber(value) && max > min;

  // Needle sweeps from the low end on first paint, then settles.
  useEffect(() => {
    const id = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const frac = hasValue ? clamp01((value - min) / (max - min)) : 0;
  const goodness = invert ? 1 - frac : frac;
  const status = !hasValue
    ? 'none'
    : goodness >= bands[1] ? 'success' : goodness >= bands[0] ? 'warning' : 'danger';

  const zones = useMemo(() => {
    const [lo, hi] = bands;
    // Spans along the arc, left → right, as fractions of the scale.
    const spans = invert
      ? [
          { key: 'success', from: 0, to: 1 - hi, color: COLORS.success },
          { key: 'warning', from: 1 - hi, to: 1 - lo, color: COLORS.warning },
          { key: 'danger', from: 1 - lo, to: 1, color: COLORS.danger },
        ]
      : [
          { key: 'danger', from: 0, to: lo, color: COLORS.danger },
          { key: 'warning', from: lo, to: hi, color: COLORS.warning },
          { key: 'success', from: hi, to: 1, color: COLORS.success },
        ];
    return spans.map((s) => ({ ...s, v: Math.max(0, s.to - s.from) }));
  }, [bands, invert]);

  const w = Math.max(Math.floor(width), 0);
  const pad = 6;
  const R = Math.max(0, w / 2 - pad);
  const cx = w / 2;
  const cy = R + pad;
  const h = Math.ceil(cy + 16);
  const inner = R * 0.74;
  const needleLen = R * 0.9;
  const deg = (armed ? frac : 0) * 180;
  const tick = isFiniteNumber(target) ? clamp01((target - min) / (max - min)) : null;
  const tickAngle = tick === null ? 0 : Math.PI * (1 - tick);

  // delta colour: up is good unless invert
  const deltaGood = isFiniteNumber(delta) ? (invert ? delta < 0 : delta > 0) : null;
  const deltaTone = delta === 0 || deltaGood === null ? 'flat' : deltaGood ? 'up' : 'down';

  const anim = animationProps();
  const aria = hasValue
    ? `${label}: ${format(value)}${sub ? `, ${sub}` : ''}`
    : `${label}: no data`;

  return (
    <div className="ds-gauge">
      <div ref={ref} className="ds-gauge__plot" style={{ height: w ? h : undefined }}>
        {w > 0 && R > 0 && (
          <>
            <PieChart width={w} height={h} role="img" aria-label={aria}>
              <Pie
                data={zones}
                dataKey="v"
                cx={cx}
                cy={cy}
                startAngle={180}
                endAngle={0}
                innerRadius={inner}
                outerRadius={R}
                paddingAngle={0}
                stroke={COLORS.surface}
                strokeWidth={2}
                {...anim}
              >
                {zones.map((z) => (
                  <Cell
                    key={z.key}
                    fill={z.color}
                    fillOpacity={status === 'none' ? 0.25 : status === z.key ? 1 : 0.4}
                  />
                ))}
              </Pie>
            </PieChart>
            <svg className="ds-gauge__overlay" width={w} height={h} aria-hidden="true">
              {tick !== null && (
                <line
                  x1={cx + Math.cos(tickAngle) * (inner - 4)}
                  y1={cy - Math.sin(tickAngle) * (inner - 4)}
                  x2={cx + Math.cos(tickAngle) * (R + 4)}
                  y2={cy - Math.sin(tickAngle) * (R + 4)}
                  stroke={COLORS.textStrong}
                  strokeWidth="2"
                  strokeDasharray="3 2"
                />
              )}
              {hasValue && (
                <g
                  style={{
                    transformOrigin: `${cx}px ${cy}px`,
                    transform: `rotate(${deg}deg)`,
                    transition: `transform ${ANIMATION.duration}ms ${ANIMATION.easing}`,
                  }}
                >
                  {/* base pose points at the low end (left); rotation sweeps it clockwise */}
                  <polygon
                    points={`${cx - needleLen},${cy} ${cx},${cy - 4} ${cx},${cy + 4}`}
                    fill={COLORS.textStrong}
                  />
                </g>
              )}
              {/* The hub is the single orange highlight: the warning zone is also orange-ish,
                  so an orange needle would disappear against it. */}
              <circle cx={cx} cy={cy} r="7" fill={COLORS.accent} stroke={COLORS.surface} strokeWidth="2" />
              <text x={cx - R + (R - inner) / 2} y={cy + 13} className="ds-gauge__end" textAnchor="middle">
                {format(min)}
              </text>
              <text x={cx + R - (R - inner) / 2} y={cy + 13} className="ds-gauge__end" textAnchor="middle">
                {format(max)}
              </text>
            </svg>
          </>
        )}
      </div>

      <div className="ds-gauge__read">
        <span className="ds-label">{label}</span>
        <span className={`ds-gauge__value ds-gauge__value--${status}`}>
          {hasValue ? format(value) : '–'}
        </span>
        {sub && <span className="ds-gauge__sub">{sub}</span>}
        {isFiniteNumber(delta) && (
          <span className={`ds-delta ds-delta--${deltaTone}`}>
            <span aria-hidden="true">{delta > 0 ? '▲' : delta < 0 ? '▼' : '■'}</span>
            {fmtDelta(delta, deltaUnit)} <span className="ds-delta__tag">{deltaLabel}</span>
          </span>
        )}
      </div>
    </div>
  );
}
