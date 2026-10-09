import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './HomeTour.css';

const STEPS = [
  { target: 'intro', title: 'Welcome', body: 'This dashboard gives a live view of IIT Palakkad. Here is a quick look around.' },
  { target: 'preview', title: 'Live figures', body: 'Headline numbers with their recent trend. Click any card to open Quick Glance.' },
  { target: 'pillars', title: 'Six dimensions', body: 'Each card opens one area of the Institute. Start with whichever interests you most.' },
  { target: 'journeys', title: 'Guided paths', body: 'Tell us who you are and we will walk you through the pages that matter most.' },
  { target: 'nirf', title: 'Rankings', body: 'See how the Institute is placed in national rankings.' },
];

const PAD = 8;

/**
 * Spotlight tour over elements tagged data-tour="<target>". Steps whose target
 * is missing are skipped. Esc or the close button ends it.
 */
export default function HomeTour({ onClose }) {
  const [steps] = useState(() => STEPS.filter((s) => document.querySelector(`[data-tour="${s.target}"]`)));
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const nextRef = useRef(null);
  const step = steps[i];

  const measure = useCallback(() => {
    const el = step && document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useLayoutEffect(() => {
    if (!step) return undefined;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'auto' });
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, measure]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    nextRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [i, onClose]);

  if (!step || !rect) return null;

  const last = i === steps.length - 1;
  const below = rect.top + rect.height + 200 < window.innerHeight;
  const cardTop = below ? rect.top + rect.height + PAD + 12 : Math.max(12, rect.top - PAD - 12 - 170);
  const cardLeft = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - 332));

  return (
    <div className="ht" role="dialog" aria-modal="true" aria-label="Dashboard tour">
      <div
        className="ht__spot"
        style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
      />
      <div className="ht__card" style={{ top: cardTop, left: cardLeft }}>
        <p className="ht__step">Step {i + 1} of {steps.length}</p>
        <h3 className="ht__title">{step.title}</h3>
        <p className="ht__body">{step.body}</p>
        <div className="ht__actions">
          <button type="button" className="ht__skip" onClick={onClose}>Skip</button>
          <button
            type="button"
            ref={nextRef}
            className="ht__next"
            onClick={() => (last ? onClose() : setI(i + 1))}
          >
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
