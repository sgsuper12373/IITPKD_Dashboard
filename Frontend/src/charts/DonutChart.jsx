import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import ChartTooltip from './ChartTooltip';
import { COLORS, SLATE_STEPS, animationProps } from './chartConfig';
import { fmtInt, fmtPct } from './format';

/**
 * Donut with a centre label. The largest slice is the single orange highlight;
 * the remaining slices step down through slate opacities. A text legend with
 * counts and shares sits underneath so the chart is readable without colour.
 *
 * data: [{ name, value }]
 */
export default function DonutChart({ data = [], centerLabel, centerSub, height = 220, valueFormat = fmtInt }) {
  const slices = data
    .filter((d) => Number.isFinite(d.value) && d.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = slices.reduce((s, d) => s + d.value, 0);
  const fillFor = (i) => (i === 0 ? COLORS.accent : COLORS.slate);
  const opacityFor = (i) => (i === 0 ? 1 : SLATE_STEPS[Math.min(i, SLATE_STEPS.length - 1)]);

  return (
    <div className="ds-donut">
      <div className="ds-donut__plot" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke={COLORS.surface}
              strokeWidth={2}
              {...animationProps()}
            >
              {slices.map((d, i) => (
                <Cell key={d.name} fill={fillFor(i)} fillOpacity={opacityFor(i)} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip formatters={{ value: valueFormat }} />} />
          </PieChart>
        </ResponsiveContainer>
        {(centerLabel || centerSub) && (
          <div className="ds-donut__center" aria-hidden="true">
            {centerLabel && <span className="ds-donut__big">{centerLabel}</span>}
            {centerSub && <span className="ds-label">{centerSub}</span>}
          </div>
        )}
      </div>
      <ul className="ds-legend">
        {slices.map((d, i) => (
          <li key={d.name}>
            <span className="ds-legend__dot" style={{ background: fillFor(i), opacity: opacityFor(i) }} />
            <span className="ds-legend__name">{d.name}</span>
            <span className="ds-legend__val">{valueFormat(d.value)} · {fmtPct(total ? (d.value / total) * 100 : null, 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
