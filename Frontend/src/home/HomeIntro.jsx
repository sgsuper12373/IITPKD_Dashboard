import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import CampusSkyline from '../components/CampusSkyline';
import './HomeIntro.css';

export default function HomeIntro() {
  return (
    <section className="hi" data-tour="intro">
      <div className="hi__content">
        <h1 id="hi-title" className="hi__title">
          Indian Institute of Technology Palakkad
        </h1>
        <p className="hi__desc">
          Explore institutional data across research, education, innovation and
          outreach — all in one place.
        </p>
        <Link to="/quick-glance" className="hi__cta">
          Quick glance <ArrowRight size={16} strokeWidth={2} />
        </Link>
      </div>
      <CampusSkyline className="hi__skyline" />
    </section>
  );
}
