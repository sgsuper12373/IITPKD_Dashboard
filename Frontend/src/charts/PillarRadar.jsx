import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartTooltip from './ChartTooltip';
import { COLORS, FONT, MARGINS, animationProps } from './chartConfig';
import { fmtNum } from './format';

/**
 * Six-pillar radar. `current` / `previous` are arrays of
 * { key, label, short, value } with value on a 0–100 scale (null = no data,
 * plotted as 0). Previous year is dashed. The strongest current pillar gets the
 * single orange marker.
 *
 * The scoring formula lives in chartConfig.js (PILLARS) and is applied in
 * src/utils/pulseModel.js.
 */
export default function PillarRadar({ current = [], previous = [], currentLabel = 'Selected year', previousLabel = 'Previous year', height = 280 }) {
  const rows = current.map((c, i) => ({
    pillar: c.short ?? c.label,
    full: c.label,
    current: c.value ?? 0,
    previous: previous[i]?.value ?? 0,
    noData: c.value === null || c.value === undefined,
  }));

  let topIdx = -1;
  let topVal = -1;
  rows.forEach((r, i) => {
    if (!r.noData && r.current > topVal) { topVal = r.current; topIdx = i; }
  });

  const anim = animationProps();
  const fmt = (v) => fmtNum(v, 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={rows} margin={MARGINS.radar} outerRadius="72%">
        <PolarGrid stroke={COLORS.grid} />
        <PolarAngleAxis dataKey="pillar" tick={{ fontSize: FONT.tick, fill: COLORS.slate }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Tooltip
          content={
            <ChartTooltip
              labelFormatter={(l, p) => p?.[0]?.payload?.full ?? l}
              formatters={{ current: fmt, previous: fmt }}
            />
          }
        />
        <Radar
          name={previousLabel}
          dataKey="previous"
          stroke={COLORS.slate}
          strokeOpacity={0.55}
          strokeDasharray="4 3"
          fill="none"
          {...anim}
        />
        <Radar
          name={currentLabel}
          dataKey="current"
          stroke={COLORS.slate}
          strokeWidth={2}
          fill={COLORS.slate}
          fillOpacity={0.15}
          dot={({ cx, cy, index, key }) =>
            index === topIdx && cx !== undefined ? (
              <circle key={key ?? index} cx={cx} cy={cy} r={5} fill={COLORS.accent} stroke={COLORS.surface} strokeWidth={1.5} />
            ) : (
              <g key={key ?? index} />
            )
          }
          {...anim}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: FONT.label, color: COLORS.slate }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
