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
  // '/quick-glance': 'chart',
  '/outreach-extension/students-engagement': 'students',
  '/outreach-extension/social-engagement': 'outreach',
  '/innovation-entrepreneurship/startup-portfolio': 'startup',
  '/innovation-entrepreneurship/iptif/facilities': 'industry',
  '/innovation-entrepreneurship/home-ground-startup': 'home',
};

const Chevron = () => (
  <svg className="sg-card__chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function SectionSuggestions({ pillar, sectionId, siblings = [], onOpen }) {
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
              <DashboardIcon name="aim" size={18} />
            </span>
            <div className="sg-panel__meta">
              <h3 id="sg-explore-title" className="sg-panel__title">Explore next</h3>
              <p className="sg-panel__subtitle">Continue your journey in {pillarLabel}</p>
            </div>
          </div>
          <div className="sg-panel__cards">
            {siblings.map((s) => (
              <button
                key={s.id}
                type="button"
                className="sg-card"
                onClick={() => { onOpen(s.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              >
                {s.icon && <span className="sg-card__icon">{s.icon}</span>}
                <div className="sg-card__text">
                  <span className="sg-card__name">{s.title}</span>
                  {s.blurb && <span className="sg-card__desc">{s.blurb}</span>}
                </div>
                <Chevron />
              </button>
            ))}
          </div>
        </section>
      )}

      {relatedPages.length > 0 && (
        <section className="sg-panel sg-panel--keep" aria-labelledby="sg-keep-title">
          <div className="sg-panel__header">
            <span className="sg-panel__badge sg-panel__badge--teal">
              <DashboardIcon name="global" size={18} />
            </span>
            <div className="sg-panel__meta">
              <h3 id="sg-keep-title" className="sg-panel__title">Keep exploring</h3>
              <p className="sg-panel__subtitle">Discover more about IIT Palakkad</p>
            </div>
            <Link to="/" className="sg-panel__view-all">View all&nbsp;→</Link>
          </div>
          <div className="sg-panel__cards">
            {relatedPages.map((p) => (
              <Link key={p.path} to={p.path} className="sg-card">
                <span className="sg-card__icon">
                  <DashboardIcon name={PAGE_ICON[p.path] || 'grid'} size={16} />
                </span>
                <div className="sg-card__text">
                  <span className="sg-card__name">{p.title}</span>
                  <span className="sg-card__desc">{p.blurb}</span>
                </div>
                <Chevron />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
