import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isKnownPath, normalizePath, pageFor } from './exploreMap';

const KEY = 'recentPages';
const MAX = 4;

/** Reads are validated against the known-page table, so tampered storage can't inject links. */
export function readRecent() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((p) => typeof p === 'string' && isKnownPath(p)).map(pageFor).slice(0, MAX);
  } catch {
    return [];
  }
}

/** Records the current page (if it is a known public page) in this browser only. */
export function useRecordVisit() {
  const { pathname } = useLocation();
  useEffect(() => {
    const path = normalizePath(pathname);
    if (!isKnownPath(path)) return;
    try {
      const prev = readRecent().map((p) => p.path).filter((p) => p !== path);
      localStorage.setItem(KEY, JSON.stringify([path, ...prev].slice(0, MAX)));
    } catch { /* storage unavailable: feature simply stays empty */ }
  }, [pathname]);
}
