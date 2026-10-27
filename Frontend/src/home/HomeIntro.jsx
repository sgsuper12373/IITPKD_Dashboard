import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './HomeIntro.css';

export default function HomeIntro() {
  const videoRef = useRef(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onVisibility = () => {
      if (document.hidden) video.pause();
      else video.play().catch(() => {});
    };

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) video.pause();

    const onMotionPref = (e) => {
      if (e.matches) video.pause();
      else if (!document.hidden) video.play().catch(() => {});
    };

    document.addEventListener('visibilitychange', onVisibility);
    mq.addEventListener('change', onMotionPref);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      mq.removeEventListener('change', onMotionPref);
    };
  }, []);

  return (
    <section className="hi" data-tour="intro">
      {!videoFailed && (
        <video
          ref={videoRef}
          className="hi__video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setVideoFailed(true)}
        >
          <source src="/NilaCampusFlyBy.mp4" type="video/mp4" />
        </video>
      )}

      <div className="hi__overlay" aria-hidden="true" />

      <div className="hi__content">
        <span className="hi__eyebrow">INDIAN INSTITUTE OF</span>
        <h1 id="hi-title" className="hi__title">
          Technology Palakkad
        </h1>
        <span className="hi__accent" aria-hidden="true" />
        <p className="hi__desc">
          Explore institutional data across research, education, innovation and
          outreach — all in one place.
        </p>
        <Link to="/quick-glance" className="hi__cta">
          Quick glance <ArrowRight size={16} strokeWidth={2} />
        </Link>
      </div>

      <div className="hi__tagline" aria-hidden="true">
        <span>PEOPLE</span>
        <span>IDEAS</span>
        <span>INNOVATION</span>
        <span>IMPACT</span>
      </div>

      <div className="hi__location">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        IIT Palakkad Campus
      </div>
    </section>
  );
}
