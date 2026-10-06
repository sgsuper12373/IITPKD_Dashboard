import { useEffect, useRef, useState } from 'react';
import { MOBILE } from './chartConfig';

/** True at or below the mobile breakpoint; owned by ChartCard so sections never re-implement it. */
export function useChartIsMobile() {
  const query = `(max-width: ${MOBILE.maxWidth}px)`;
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return isMobile;
}

/** Observes an element's content width/height. */
export function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
          ? prev
          : { width, height }
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}
