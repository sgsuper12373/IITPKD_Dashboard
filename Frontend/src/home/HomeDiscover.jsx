import { useState } from 'react';
import { Link } from 'react-router-dom';
import { JOURNEYS, KPI_PUBLIC_PATH, journeyHref } from './exploreMap';
import { FreshnessBadge } from './Badges';
import { Reveal, CountUp } from './motion';
import { popularPages, usePopular } from './usePopular';
import { fmtNum } from '../charts/format';
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
            <Link to={h.to} className={`hd__high hd__high--${h.tone}`} data-track="highlight">
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
            <Link to={journeyHref(key, j.steps[0].path)} className="hd__journey" data-track={`journey-start-${key}`}>
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
            <Link to={p.path} className="hd__chip" data-track="recent-page">{p.title}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const STORY = [
  { key: 'patents', label: 'Patents filed' },
  { key: 'funding', label: 'Sponsored research funding' },
  { key: 'startups', label: 'Startups incubated' },
];

/** Large-type figures that count up as they scroll into view. */
export function NumbersStory({ data }) {
  const tiles = STORY.map((s) => {
    const k = data?.kpis.find((x) => x.key === s.key);
    return k && k.value !== '–' ? { ...s, value: k.value, sub: k.sub, to: KPI_PUBLIC_PATH[s.key] } : null;
  }).filter(Boolean);

  const placement = data?.gauges?.placement;
  if (placement && typeof placement.value === 'number') {
    tiles.push({ key: 'placement', label: 'Placement rate', value: `${fmtNum(placement.value, 1)}%`, sub: placement.sub, to: '/education' });
  }
  if (tiles.length === 0) return null;

  return (
    <section className="hd ns" aria-labelledby="ns-title">
      <h2 id="ns-title" className="hd__title">The Institute in numbers</h2>
      <ul className="ns__grid">
        {tiles.map((t, i) => (
          <li key={t.key}>
            <Reveal delay={i * 90}>
              <Link to={t.to} className="ns__tile" data-track={`number-${t.key}`}>
                <span className="ns__value"><CountUp text={t.value} /></span>
                <span className="ns__label">{t.label}</span>
                {t.sub && <span className="ns__sub">{t.sub}</span>}
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Pages other visitors view most (aggregate, same for everyone). Hidden until there is enough data. */
export function MostVisited() {
  const { top } = usePopular();
  const pages = popularPages(top).slice(0, 4);
  if (pages.length < 3) return null;
  return (
    <section className="hd" aria-labelledby="hd-popular">
      <h2 id="hd-popular" className="hd__title">Popular with visitors</h2>
      <ul className="hd__grid">
        {pages.map((p) => (
          <li key={p.path}>
            <Link to={p.path} className="hd__journey" data-track="popular">
              <span className="hd__journey-title">{p.title}</span>
              <span className="hd__journey-blurb">{p.blurb}</span>
              <FreshnessBadge path={p.path} />
              <span className="hd__journey-go" aria-hidden="true">Explore →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
