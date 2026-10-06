import { fmtInt, fmtPct, isFiniteNumber } from './format';

/**
 * Stage funnel built from proportional bars. Each stage shows its count and the
 * conversion from the previous stage; the final stage is the single orange
 * highlight. `chips` are optional secondary facts (e.g. companies, offers).
 *
 * stages: [{ label, value }]
 */
export default function FunnelBars({ stages = [], chips = [] }) {
  const top = stages.length && isFiniteNumber(stages[0].value) ? stages[0].value : 0;
  return (
    <div className="ds-funnel">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1].value : null;
        const conv = prev && isFiniteNumber(s.value) ? (s.value / prev) * 100 : null;
        const width = top > 0 && isFiniteNumber(s.value) ? Math.max(4, (s.value / top) * 100) : 0;
        const last = i === stages.length - 1;
        return (
          <div className="ds-funnel__stage" key={s.label}>
            <div className="ds-funnel__head">
              <span className="ds-label">{s.label}</span>
              <span className="ds-funnel__val">
                {fmtInt(s.value)}
                {conv !== null && <em>{fmtPct(conv, 1)} of previous</em>}
              </span>
            </div>
            <div className="ds-funnel__track">
              <div
                className={`ds-funnel__fill${last ? ' ds-funnel__fill--last' : ''}`}
                style={{ width: `${width}%`, opacity: last ? 1 : 0.55 - i * 0.1 }}
              />
            </div>
          </div>
        );
      })}
      {chips.length > 0 && (
        <ul className="ds-chips">
          {chips.map((c) => (
            <li key={c.label}>
              <span className="ds-label">{c.label}</span>
              <strong>{isFiniteNumber(c.value) ? fmtInt(c.value) : '–'}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
