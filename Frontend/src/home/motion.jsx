import { useEffect, useRef, useState } from 'react';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Calls back once when the element first scrolls into view. */
function useInView(onEnter) {
  const ref = useRef(null);
  const cb = useRef(onEnter);
  cb.current = onEnter;
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined' || reducedMotion()) {
      cb.current(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          cb.current(false);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/** Fades and lifts its children in the first time they scroll into view. */
export function Reveal({ children, delay = 0, className = '' }) {
  const [shown, setShown] = useState(false);
  const ref = useInView(() => setShown(true));
  return (
    <div ref={ref} className={`rv${shown ? ' is-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

const NUMBER_RE = /^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/;

/**
 * Counts a formatted figure ("1,234", "₹12.50 Cr", "92.4%") up from zero when it scrolls
 * into view. The final text is always what assistive tech reads and what shows without motion.
 */
export function CountUp({ text, duration = 1100 }) {
  const m = typeof text === 'string' ? NUMBER_RE.exec(text) : null;
  const target = m ? parseFloat(m[2].replace(/,/g, '')) : null;
  const decimals = m && m[2].includes('.') ? m[2].split('.')[1].length : 0;
  const [shown, setShown] = useState(null);

  const ref = useInView((instant) => {
    if (instant || target === null) return;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setShown(target * eased);
      if (t < 1) requestAnimationFrame(tick);
      else setShown(null);
    };
    requestAnimationFrame(tick);
  });

  if (!m) return <span>{text}</span>;
  const live = shown === null
    ? text
    : `${m[1]}${shown.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${m[3]}`;
  return (
    <span ref={ref} className="cu">
      <span aria-hidden="true">{live}</span>
      <span className="ex-sr">{text}</span>
    </span>
  );
}
