import { useState, useRef, useEffect, useCallback } from 'react';

function ScrollableTabBar({ children, ariaLabel }) {
  const ref = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanLeft(scrollLeft > 4);
    setCanRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [update]);

  const scroll = (dir) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  return (
    <div className="pc-tab-bar-wrap">
      <button
        type="button"
        className={`pc-tab-arrow pc-tab-arrow--left${canLeft ? '' : ' pc-tab-arrow--hidden'}`}
        onClick={() => scroll('left')}
        aria-label="Scroll tabs left"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <nav className="pc-tab-bar" role="tablist" aria-label={ariaLabel} ref={ref}>
        {children}
      </nav>
      <button
        type="button"
        className={`pc-tab-arrow pc-tab-arrow--right${canRight ? '' : ' pc-tab-arrow--hidden'}`}
        onClick={() => scroll('right')}
        aria-label="Scroll tabs right"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </div>
  );
}

export default ScrollableTabBar;
