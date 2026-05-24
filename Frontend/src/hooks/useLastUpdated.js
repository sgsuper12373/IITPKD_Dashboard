import { useEffect, useMemo, useState } from 'react';
import { fetchAllLastUpdated } from '../services/lastUpdated';

// Module-level cache so the bulk fetch happens at most once per page load,
// regardless of how many components call this hook simultaneously.
let _cache = null;
let _pending = null;

async function loadAll() {
  if (_cache) return _cache;
  if (!_pending) {
    _pending = fetchAllLastUpdated()
      .then((data) => { _cache = data; return data; })
      .catch(() => { _pending = null; return {}; });
  }
  return _pending;
}

/**
 * Returns the latest ISO timestamp among the supplied table names,
 * or null while loading / if none have data.
 *
 * @param {string[]} tables  e.g. ['research_patents', 'research_mous']
 */
export function useLastUpdated(tables) {
  const [all, setAll] = useState(_cache ?? {});

  useEffect(() => {
    if (_cache) { setAll(_cache); return; }
    let alive = true;
    loadAll().then((data) => { if (alive) setAll(data); });
    return () => { alive = false; };
  }, []);

  return useMemo(() => {
    const relevant = tables
      .map((t) => all[t])
      .filter(Boolean);
    if (!relevant.length) return null;
    return relevant.reduce((a, b) => (a > b ? a : b));
  }, [tables, all]);
}
