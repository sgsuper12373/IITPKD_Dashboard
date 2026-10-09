import { useEffect, useState } from 'react';
import { isKnownPath, normalizePath, pageFor } from './exploreMap';

const ENDPOINT = `${import.meta.env.VITE_API_BASE_URL}/api/analytics/popular`;
const EMPTY = { top: [], also: {} };

let cache = null;
let pending = null;

/** Server answers are only ever used as lookup keys into the known-page table. */
function sanitize(raw) {
  const known = (list) => (Array.isArray(list) ? list.filter((p) => typeof p === 'string' && isKnownPath(p)).map(normalizePath) : []);
  const also = {};
  if (raw && typeof raw.also === 'object' && raw.also) {
    Object.entries(raw.also).forEach(([k, v]) => {
      if (isKnownPath(k)) also[normalizePath(k)] = known(v);
    });
  }
  return { top: known(raw?.top), also };
}

function load() {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch(ENDPOINT, { credentials: 'omit' })
      .then((r) => (r.ok ? r.json() : EMPTY))
      .then((d) => { cache = sanitize(d); return cache; })
      .catch(() => { pending = null; return EMPTY; });
  }
  return pending;
}

/**
 * Aggregate, non-personalised "what other visitors view" data.
 * `top`: page paths ranked by visits; `also[path]`: pages visited in the same sessions.
 * Both are empty until enough visits exist (the server enforces a minimum).
 */
export function usePopular() {
  const [data, setData] = useState(cache ?? EMPTY);
  useEffect(() => {
    let alive = true;
    load().then((d) => { if (alive) setData(d); });
    return () => { alive = false; };
  }, []);
  return data;
}

export const popularPages = (paths) => paths.map(pageFor).filter(Boolean);
