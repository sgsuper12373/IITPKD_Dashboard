import { Link } from 'react-router-dom';
import { openJump } from './jumpEvents';
import './HomeIntro.css';

/**
 * Orientation strip shown under the home page title: says what the dashboard is
 * and offers two obvious first moves (live preview, guided tour).
 */
export default function HomeIntro({ onStartTour }) {
  return (
    <section className="hi" aria-label="About this dashboard" data-tour="intro">
      <p className="hi__text">
        A live view of IIT Palakkad across six dimensions: people &amp; campus, research, education, industry,
        innovation and outreach. Numbers come straight from the offices that own them, so what you see here is current.
      </p>
      <div className="hi__actions">
        <Link to="/quick-glance" className="hi__btn hi__btn--primary" data-track="intro-glance">
          See the Institute at a glance <span aria-hidden="true">→</span>
        </Link>
        <button type="button" className="hi__btn" onClick={onStartTour} data-track="intro-tour">
          Take a 30-second tour
        </button>
        <button type="button" className="hi__btn" onClick={openJump} data-track="intro-jump">
          Jump to a page <kbd className="hi__kbd">Ctrl K</kbd>
        </button>
      </div>
    </section>
  );
}
