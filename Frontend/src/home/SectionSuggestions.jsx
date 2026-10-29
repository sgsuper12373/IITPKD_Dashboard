import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { relatedFor } from './exploreMap';
import DashboardIcon from '../components/DashboardIcon';
import './SectionSuggestions.css';

const PILLAR_PATH = {
  education: '/education',
  research: '/research',
  'people-campus': '/people-campus',
  'industry-connect': '/industry-connect',
  innovation: '/innovation-entrepreneurship',
  outreach: '/outreach-extension',
};

const PILLAR_LABEL = {
  education: 'Education',
  research: 'Research',
  'people-campus': 'People & Campus',
  'industry-connect': 'Industry Connect',
  innovation: 'Innovation & Entrepreneurship',
  outreach: 'Outreach & Extension',
};

const PAGE_ICON = {
  '/research': 'research',
  '/industry-connect': 'industry',
  '/education': 'education',
  '/people-campus': 'people',
  '/innovation-entrepreneurship': 'innovation',
  '/outreach-extension': 'outreach',
  '/outreach-extension/students-engagement': 'students',
  '/outreach-extension/social-engagement': 'outreach',
  '/innovation-entrepreneurship/startup-portfolio': 'startup',
  '/innovation-entrepreneurship/iptif/facilities': 'industry',
  '/innovation-entrepreneurship/home-ground-startup': 'home',
};

const Arrow = ({ dir, onClick, visible }) => (
  <button
    type="button"
    className={`sg-arrow sg-arrow--${dir}${visible ? '' : ' sg-arrow--hidden'}`}
    onClick={onClick}
    aria-label={`Scroll ${dir}`}
  >
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d={dir === 'left' ? 'M10 4L6 8L10 12' : 'M6 4L10 8L6 12'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </button>
);

function useHorizontalScroll(ref) {
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanLeft(scrollLeft > 4);
    setCanRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [ref, update]);

  const scroll = useCallback((dir) => {
    const el = ref.current;
    if (!el) return;
    const amount = el.clientWidth * 0.6;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  }, [ref]);

  return { canLeft, canRight, scroll };
}

function ScrollableCards({ innerRef, children, canLeft, canRight, scroll }) {
  return (
    <div className="sg-scroll-wrap">
      <Arrow dir="left" onClick={() => scroll('left')} visible={canLeft} />
      <div className="sg-panel__cards" ref={innerRef}>
        {children}
      </div>
      <Arrow dir="right" onClick={() => scroll('right')} visible={canRight} />
    </div>
  );
}

export default function SectionSuggestions({ pillar, sectionId, siblings = [], onOpen }) {
  const exploreRef = useRef(null);
  const keepRef = useRef(null);
  const exploreScroll = useHorizontalScroll(exploreRef);
  const keepScroll = useHorizontalScroll(keepRef);

  const pillarPath = PILLAR_PATH[pillar] || `/${pillar}`;
  const pillarLabel = PILLAR_LABEL[pillar] || pillar;
  const relatedPages = relatedFor(pillarPath);

  if (siblings.length === 0 && relatedPages.length === 0) return null;

  const hasBoth = siblings.length > 0 && relatedPages.length > 0;

  return (
    <div className={`sg-panels${hasBoth ? '' : ' sg-panels--single'}`}>
      {siblings.length > 0 && (
        <section className="sg-panel sg-panel--explore" aria-labelledby="sg-explore-title">
          <div className="sg-panel__header">
            <span className="sg-panel__badge sg-panel__badge--gold">
              <DashboardIcon name="aim" size={16} />
            </span>
            <div className="sg-panel__meta">
              <h3 id="sg-explore-title" className="sg-panel__title">Explore next</h3>
              <p className="sg-panel__subtitle">Continue in {pillarLabel}</p>
            </div>
          </div>
          <ScrollableCards innerRef={exploreRef} {...exploreScroll}>
            {siblings.map((s) => (
              <button
                key={s.id}
                type="button"
                className="sg-card"
                onClick={() => { onOpen(s.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              >
                {s.icon && <span className="sg-card__icon">{s.icon}</span>}
                <span className="sg-card__name">{s.title}</span>
              </button>
            ))}
          </ScrollableCards>
        </section>
      )}

      {relatedPages.length > 0 && (
        <section className="sg-panel sg-panel--keep" aria-labelledby="sg-keep-title">
          <div className="sg-panel__header">
            <span className="sg-panel__badge sg-panel__badge--teal">
              <DashboardIcon name="global" size={16} />
            </span>
            <div className="sg-panel__meta">
              <h3 id="sg-keep-title" className="sg-panel__title">Keep exploring</h3>
              <p className="sg-panel__subtitle">Discover more about IIT Palakkad</p>
            </div>
            <Link to="/" className="sg-panel__view-all">View all →</Link>
          </div>
          <ScrollableCards innerRef={keepRef} {...keepScroll}>
            {relatedPages.map((p) => (
              <Link key={p.path} to={p.path} className="sg-card">
                <span className="sg-card__icon">
                  <DashboardIcon name={PAGE_ICON[p.path] || 'grid'} size={14} />
                </span>
                <span className="sg-card__name">{p.title}</span>
              </Link>
            ))}
          </ScrollableCards>
        </section>
      )}
    </div>
  );
}
