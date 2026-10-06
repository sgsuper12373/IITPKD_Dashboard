import { fmtNum } from './format';

/**
 * Shared Recharts tooltip. Values are rendered as React text nodes (escaped);
 * nothing from the API is ever injected as HTML.
 */
export default function ChartTooltip({ active, payload, label, formatters = {}, labelFormatter }) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;
  const heading = labelFormatter ? labelFormatter(label, payload) : label;
  return (
    <div className="ds-tip" role="status">
      {heading !== undefined && heading !== null && heading !== '' && (
        <p className="ds-tip__label">{String(heading)}</p>
      )}
      {payload.map((entry, i) => {
        const name = entry.name ?? entry.dataKey;
        const fmt = formatters[entry.dataKey] || formatters[name];
        const value = fmt ? fmt(entry.value, entry) : fmtNum(Number(entry.value), 2);
        return (
          <div className="ds-tip__row" key={`${entry.dataKey ?? name}-${i}`}>
            <span className="ds-tip__dot" style={{ background: entry.color || entry.fill }} />
            <span className="ds-tip__name">{String(name)}</span>
            <span className="ds-tip__val">{value}</span>
          </div>
        );
      })}
    </div>
  );
}
