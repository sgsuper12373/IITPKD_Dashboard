import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackClick, trackPageView } from './track';

/** Page views on route change, plus clicks on any element tagged data-track="label". */
export function usePageTracking() {
  const { pathname } = useLocation();
  const previous = useRef(null);
  const current = useRef(pathname);

  useEffect(() => {
    current.current = pathname;
    trackPageView(pathname, previous.current);
    previous.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const onClick = (e) => {
      const el = e.target instanceof Element ? e.target.closest('[data-track]') : null;
      if (el) trackClick(el.getAttribute('data-track'), current.current);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
