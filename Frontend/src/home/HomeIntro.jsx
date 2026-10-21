import { openJump } from './jumpEvents';
import { CountUp } from './motion';
import './HomeIntro.css';

const HERO_STATS = ['students', 'faculty', 'publications'];

/**
 * Home hero: the page's single h1, one sentence of context, three large live figures
 * and the first moves (glance, tour, search).
 */
export default function HomeIntro({ data, onNotSure }) {
  const stats = HERO_STATS.map((key) => data?.kpis.find((k) => k.key === key)).filter((k) => k && k.value !== '–');

  return (
    <section className="hi" aria-labelledby="hi-title" data-tour="intro">
      <h1 id="hi-title" className="hi__title">Exploring the Vision that shapes Us</h1>
      {stats.length > 0 && (
        <ul className="hi__stats">
          {stats.map((k) => (
            <li key={k.key} className="hi__stat">
              <span className="hi__stat-value"><CountUp text={k.value} /></span>
              <span className="hi__stat-label">{k.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="hi__actions">
        <a href="#quick-glance" className="hi__btn hi__btn--primary" data-track="intro-glance">
          See the Institute at a glance <span aria-hidden="true">↓</span>
        </a>
        <button type="button" className="hi__btn" onClick={onNotSure} data-track="intro-not-sure">
          Not sure where to start? Click here to know
        </button>
        <button type="button" className="hi__btn" onClick={openJump} data-track="intro-jump">
          Jump to a page <kbd className="hi__kbd">Ctrl K</kbd>
        </button>
      </div>
    </section>
  );
}
