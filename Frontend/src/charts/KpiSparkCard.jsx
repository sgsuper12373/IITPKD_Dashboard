import { useId } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import ChartCard from './ChartCard';
import { COLORS, MARGINS, animationProps } from './chartConfig';
import { fmtDelta, isFiniteNumber } from './format';

/**
 * KPI tile: label, headline value, YoY delta and a 7-year AreaChart sparkline.
 * `series` is an array of numbers (null allowed) ending at the selected year;
 * the final point is the single orange highlight.
 */
export default function KpiSparkCard({
  label,
  value,
  delta,
  deltaUnit = '%',
  deltaLabel = 'YoY',
  invert = false,
  series = [],
  sub,
  to,
  empty,
  loading,
}) {
  const gid = `ds-spark-${useId().replace(/:/g, '')}`;
  const points = series.map((v, i) => ({ i, v: isFiniteNumber(v) ? v : null }));
  const lastIdx = points.length - 1;
  const hasSeries = points.some((p) => p.v !== null);
  const deltaGood = isFiniteNumber(delta) ? (invert ? delta < 0 : delta > 0) : null;
  const tone = delta === 0 || deltaGood === null ? 'flat' : deltaGood ? 'up' : 'down';
  const isEmpty = empty ?? (value === null || value === undefined || value === '–');

  return (
    <ChartCard title={label} to={to} compact expandable={false} empty={isEmpty} loading={loading}>
      {() => (
        <div className="ds-kpi">
          <div className="ds-kpi__top">
            <span className="ds-kpi__value">{value}</span>
            {isFiniteNumber(delta) && (
              <span className={`ds-delta ds-delta--${tone}`}>
                <span aria-hidden="true">{delta > 0 ? '▲' : delta < 0 ? '▼' : '■'}</span>
                {fmtDelta(delta, deltaUnit)} <span className="ds-delta__tag">{deltaLabel}</span>
              </span>
            )}
          </div>
          <div className="ds-kpi__spark" role="img" aria-label={`${label}, last ${points.length} years`}>
            {hasSeries && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points} margin={MARGINS.spark}>
                  <defs>
                    <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.slate} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={COLORS.slate} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={COLORS.slate}
                    strokeWidth={1.75}
                    fill={`url(#${gid})`}
                    connectNulls
                    dot={({ cx, cy, index, key }) =>
                      index === lastIdx && cx !== undefined ? (
                        <circle
                          key={key ?? index}
                          cx={cx}
                          cy={cy}
                          r={3.5}
                          fill={COLORS.accent}
                          stroke={COLORS.surface}
                          strokeWidth={1.5}
                        />
                      ) : (
                        <g key={key ?? index} />
                      )
                    }
                    activeDot={false}
                    {...animationProps()}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          {sub && <p className="ds-kpi__sub">{sub}</p>}
        </div>
      )}
    </ChartCard>
  );
}
