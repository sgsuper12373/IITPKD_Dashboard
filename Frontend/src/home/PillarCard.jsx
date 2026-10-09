import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, FreshnessBadge } from './Badges';
import { CountUp } from './motion';
import { fmtDelta, fmtInt, fmtNum, isFiniteNumber } from '../charts/format';
import './PillarCard.css';

/* Chip label + where the number comes from (data.kpis key, or a gauge). */
const METRIC_CHIP = {
  faculty: 'Faculty',
  students: 'Students',
  publications: 'Publications',
  patents: 'Patents',
  funding: 'Funding',
  startups: 'Startups',
  placement: 'Placements',
  nirf: 'NIRF rank',
};

function buildMetric(key, data) {
  if (!data) return null;
  if (key === 'placement') {
    const g = data.gauges?.placement;
    if (!g || !isFiniteNumber(g.value)) return null;
    return { key, label: 'Placement rate', value: `${fmtNum(g.value, 1)}%`, delta: g.delta, unit: 'pp', deltaLabel: 'vs last year', sub: g.sub };
  }
  if (key === 'nirf') {
    const g = data.gauges?.nirf;
    if (!g || !isFiniteNumber(g.value)) return null;
    return { key, label: 'NIRF rank, engineering', value: `#${fmtInt(g.value)}`, delta: g.delta, unit: ' places', invert: true, deltaLabel: 'vs last edition', sub: g.sub };
  }
  const k = data.kpis?.find((x) => x.key === key);
  if (!k || k.value === '–') return null;
  return { key, label: k.label, value: k.value, delta: k.delta, unit: '%', invert: k.invert, deltaLabel: k.deltaLabel, series: k.series, sub: k.sub };
}

/** Tiny inline trend line; draws nothing with fewer than two real points. */
function Spark({ series }) {
  const pts = (series ?? []).map((v, i) => (isFiniteNumber(v) ? { i, v } : null)).filter(Boolean);
  if (pts.length < 2) return null;
  const W = 120, H = 34, P = 3;
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const last = (series?.length ?? 1) - 1 || 1;
  const x = (i) => P + (i / last) * (W - P * 2);
  const y = (v) => (max === min ? H / 2 : H - P - ((v - min) / (max - min)) * (H - P * 2));
  const d = pts.map((p, n) => `${n ? 'L' : 'M'}${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const end = pts[pts.length - 1];
  return (
    <svg className="pc__spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Trend over recent years">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(end.i)} cy={y(end.v)} r="3" fill="var(--ds-accent)" />
    </svg>
  );
}

const CYCLE_MS = 5000;

/**
 * Interactive pillar card. The whole card opens the pillar page (stretched title link);
 * the metric chips, "Our vision" toggle and sub-page pills sit above it as separate controls.
 */
export default function PillarCard({ pillar, data, index }) {
  const { id, path, icon, title, vision, sub } = pillar;
  const metrics = pillar.metrics.map((m) => buildMetric(m, data)).filter(Boolean);
  const [activeKey, setActiveKey] = useState(null);
  const [paused, setPaused] = useState(false);
  const [touched, setTouched] = useState(false);
  const [visionOpen, setVisionOpen] = useState(false);
  const visionId = useId();

  const active = metrics.find((m) => m.key === activeKey) ?? metrics[0];
  const activeIdx = active ? metrics.indexOf(active) : 0;

  // Gently rotate through the metrics until the visitor interacts with this card.
  useEffect(() => {
    if (metrics.length < 2 || paused || touched) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setActiveKey(metrics[(activeIdx + 1) % metrics.length].key), CYCLE_MS);
    return () => clearInterval(t);
  }, [metrics.length, activeIdx, paused, touched]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (key) => { setTouched(true); setActiveKey(key); };
  const delta = active && isFiniteNumber(active.delta) && active.delta !== 0 ? active : null;
  const good = delta ? (delta.invert ? delta.delta < 0 : delta.delta > 0) : null;
  const nirf = id === 'education' ? buildMetric('nirf', data) : null;

  return (
    <article
      className="vision-pillar-card pc"
      style={{ animationDelay: `${index * 70}ms` }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <h3 className="vision-pillar-title">
        <span className="vision-pillar-icon" aria-hidden="true">{icon}</span>
        <Link to={path} className="pc__link vision-pillar-title-text" data-track={`pillar-${id}`}>{title}</Link>
      </h3>

      {active ? (
        <div className="pc__metric" aria-live="polite">
          <div className="pc__metric-row">
            <span className="pc__value"><CountUp key={active.key} text={active.value} duration={700} /></span>
            <Spark series={active.series} />
          </div>
          <p className="pc__metric-label">
            {active.label}
            {delta && (
              <span className={`pc__delta pc__delta--${good ? 'up' : 'down'}`}>
                <span aria-hidden="true">{delta.delta > 0 ? '▲' : '▼'}</span> {fmtDelta(delta.delta, delta.unit)} <span className="pc__delta-tag">{delta.deltaLabel}</span>
              </span>
            )}
          </p>
        </div>
      ) : (
        <p className="pc__metric-label pc__metric-label--idle">Explore the numbers and stories</p>
      )}

      {metrics.length > 1 && (
        <div className="pc__chips" role="group" aria-label={`${id} figures`}>
          {metrics.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`pc__chip${m.key === active.key ? ' is-active' : ''}`}
              aria-pressed={m.key === active.key}
              onMouseEnter={() => pick(m.key)}
              onFocus={() => pick(m.key)}
              onClick={() => pick(m.key)}
              data-track={`pillar-chip-${m.key}`}
            >
              {METRIC_CHIP[m.key]}
            </button>
          ))}
        </div>
      )}

      {sub.length > 0 && (
        <div className="pc__sub" aria-label="Jump straight to">
          {sub.map((s) => (
            <Link key={s.path} to={s.path} className="pc__pill" data-track={`pillar-sub-${id}`}>{s.label}</Link>
          ))}
        </div>
      )}

      <button
        type="button"
        className="pc__vision-toggle"
        aria-expanded={visionOpen}
        aria-controls={visionId}
        onClick={() => setVisionOpen((o) => !o)}
        data-track="pillar-vision"
      >
        Our vision <span aria-hidden="true" className={`pc__caret${visionOpen ? ' is-open' : ''}`}>▾</span>
      </button>
      <div id={visionId} className={`pc__vision${visionOpen ? ' is-open' : ''}`}>
        <ul className="vision-pillar-list" inert={!visionOpen}>
          {vision.map((v) => <li key={v}>{v}</li>)}
        </ul>
      </div>

      <div className="vision-pillar-foot">
        <span className="vision-pillar-badges">
          {nirf && <Badge tone="gold">NIRF {nirf.value}</Badge>}
          <FreshnessBadge path={path} />
        </span>
        <span className="vision-pillar-cta" aria-hidden="true">Explore →</span>
      </div>
    </article>
  );
}
