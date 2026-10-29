import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './HomeIntro.css';

function isLowEndDevice() {
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return true;
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) return true;
  if (navigator.connection) {
    const { effectiveType, saveData } = navigator.connection;
    if (saveData) return true;
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return true;
  }
  return false;
}

export default function HomeIntro() {
  const videoRef = useRef(null);
  const sectionRef = useRef(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [lowEnd] = useState(isLowEndDevice);

  const tryPlay = useCallback(() => {
    const v = videoRef.current;
    if (v && v.paused && !document.hidden) v.play().catch(() => {});
  }, []);

  const tryPause = useCallback(() => {
    const v = videoRef.current;
    if (v && !v.paused) v.pause();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionMq.matches) { tryPause(); return; }

    // Pause when tab hidden, resume when visible (if hero still in view)
    const onVisibility = () => {
      if (document.hidden) tryPause();
      // resume handled by IntersectionObserver re-check below
    };

    // Pause when user scrolls past the hero, resume when hero comes back
    let heroVisible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        heroVisible = entry.isIntersecting;
        if (heroVisible && !document.hidden) tryPlay();
        else tryPause();
      },
      { threshold: 0.15 }
    );
    observer.observe(section);

    const onMotionPref = (e) => {
      if (e.matches) tryPause();
      else if (heroVisible) tryPlay();
    };

    // On low-end devices, pause after the first loop completes
    let loopCount = 0;
    const onLoop = () => {
      loopCount++;
      if (lowEnd && loopCount >= 1) {
        tryPause();
        video.removeEventListener('ended', onLoop);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    motionMq.addEventListener('change', onMotionPref);
    if (lowEnd) video.addEventListener('ended', onLoop);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      motionMq.removeEventListener('change', onMotionPref);
      if (lowEnd) video.removeEventListener('ended', onLoop);
    };
  }, [lowEnd, tryPlay, tryPause]);

  return (
    <section className="hi" ref={sectionRef} data-tour="intro">
      {!videoFailed && (
        <video
          ref={videoRef}
          className="hi__video"
          autoPlay
          muted
          loop={!lowEnd}
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
        {/* <Link to="/quick-glance" className="hi__cta">
          Quick glance <ArrowRight size={16} strokeWidth={2} />
        </Link> */}
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
