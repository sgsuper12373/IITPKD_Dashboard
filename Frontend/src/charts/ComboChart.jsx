import { ComposedChart, Bar, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartTooltip from './ChartTooltip';
import { COLORS, FONT, MARGINS, animationProps, limitYears } from './chartConfig';

/**
 * Bars (left axis) + line (right axis when `dualAxis`). The bar of
 * `selectedYear` is the single orange highlight; everything else is slate.
 *
 * data rows: { year: <numeric start year>, label: '2024-25', [barKey], [lineKey] }
 */
export default function ComboChart({
  data,
  barKey,
  lineKey,
  selectedYear,
  dualAxis = true,
  barName = barKey,
  lineName = lineKey,
  barFormat,
  lineFormat,
  isMobile = false,
  height = 260,
}) {
  const rows = limitYears(data, isMobile);
  const anim = animationProps();
  const tick = { fontSize: FONT.tick, fill: COLORS.slate };
  const lineAxis = dualAxis ? 'right' : 'left';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={MARGINS.combo}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={{ stroke: COLORS.grid }} interval="preserveStartEnd" />
        <YAxis yAxisId="left" tick={tick} tickLine={false} axisLine={false} width={44} tickFormatter={barFormat} />
        {dualAxis && (
          <YAxis yAxisId="right" orientation="right" tick={tick} tickLine={false} axisLine={false} width={44} tickFormatter={lineFormat} />
        )}
        <Tooltip
          cursor={{ fill: COLORS.slateFaint }}
          content={
            <ChartTooltip
              formatters={{
                [barKey]: barFormat,
                [lineKey]: lineFormat,
              }}
            />
          }
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: FONT.label, color: COLORS.slate }} />
        <Bar yAxisId="left" dataKey={barKey} name={barName} fill={COLORS.slateSoft} radius={[3, 3, 0, 0]} maxBarSize={36} {...anim}>
          {rows.map((r) => (
            <Cell key={r.year} fill={r.year === selectedYear ? COLORS.accent : COLORS.slateSoft} />
          ))}
        </Bar>
        <Line
          yAxisId={lineAxis}
          dataKey={lineKey}
          name={lineName}
          type="monotone"
          stroke={COLORS.slate}
          strokeWidth={2}
          dot={{ r: 3, fill: COLORS.slate, stroke: COLORS.surface, strokeWidth: 1 }}
          connectNulls
          {...anim}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
