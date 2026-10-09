import { useState } from 'react';
import { Link } from 'react-router-dom';
import { JOURNEYS, journeyHref } from './exploreMap';
import { buildHighlights } from './highlights';
import { readRecent } from './useRecentPages';
import './Explore.css';

/** Insight cards generated from the loaded data, each leading to its section. */
export function Highlights({ data }) {
  const items = buildHighlights(data);
  if (items.length === 0) return null;
  return (
    <section className="hd" aria-labelledby="hd-high">
      <h2 id="hd-high" className="hd__title">What's changed</h2>
      <ul className="hd__grid">
        {items.map((h) => (
          <li key={h.key}>
            <Link to={h.to} className={`hd__high hd__high--${h.tone}`}>
              <span className="hd__high-mark" aria-hidden="true">{h.tone === 'up' ? '▲' : '▼'}</span>
              <span className="hd__high-text">{h.text}</span>
              <span className="hd__high-go" aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "I'm a …" starting points. */
export function JourneyPicker() {
  return (
    <section className="hd" aria-labelledby="hd-journey" data-tour="journeys">
      <h2 id="hd-journey" className="hd__title">Not sure where to start?</h2>
      <ul className="hd__grid hd__grid--3">
        {Object.entries(JOURNEYS).map(([key, j]) => (
          <li key={key}>
            <Link to={journeyHref(key, j.steps[0].path)} className="hd__journey">
              <span className="hd__journey-title">{j.title}</span>
              <span className="hd__journey-blurb">{j.blurb}</span>
              <span className="hd__journey-go" aria-hidden="true">Start the {j.steps.length}-stop tour →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Pages this browser visited recently (stored locally only). */
export function RecentPages() {
  const [recent] = useState(readRecent);
  if (recent.length === 0) return null;
  return (
    <section className="hd hd--recent" aria-labelledby="hd-recent">
      <h2 id="hd-recent" className="hd__title">Pick up where you left off</h2>
      <ul className="hd__chips">
        {recent.map((p) => (
          <li key={p.path}>
            <Link to={p.path} className="hd__chip">{p.title}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const PILLAR_LIVE = {
  'people-campus': { kpi: 'faculty', label: 'faculty' },
  research: { kpi: 'publications', label: 'publications' },
  education: { kpi: 'students', label: 'students on roll' },
  'industry-connect': { kpi: 'funding', label: 'sponsored funding' },
  innovation: { kpi: 'startups', label: 'startups incubated' },
};

/** Live teaser line + call to action inside a pillar card. */
export function PillarFooter({ id, data }) {
  const cfg = PILLAR_LIVE[id];
  const k = cfg && data?.kpis.find((x) => x.key === cfg.kpi);
  const live = k && k.value !== '–' ? `${k.value} ${cfg.label}` : null;
  return (
    <div className="vision-pillar-foot">
      <span className="vision-pillar-live">{live ?? 'Explore the numbers and stories'}</span>
      <span className="vision-pillar-cta" aria-hidden="true">Explore →</span>
    </div>
  );
}
