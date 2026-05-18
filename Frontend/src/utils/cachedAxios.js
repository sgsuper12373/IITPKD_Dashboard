/**
 * Thin axios wrapper with an in-memory TTL cache.
 *
 * Drop-in replacement for `axios` in service files — only `.get()` is cached;
 * all other methods (post, put, delete) are passed through unchanged.
 *
 * Cache is intentionally module-level (persists across component mounts) so
 * navigating back to a section loads data instantly instead of re-fetching.
 * A page reload clears everything, which is the correct behaviour after uploads.
 */
import axios from 'axios';

// ─── Tunable constants ───────────────────────────────────────────────────────
const DEFAULT_TTL  = 90 * 1000;   // 90 s — general data
const OPTIONS_TTL  = 5 * 60 * 1000; // 5 min — filter-options (rarely change)

// URLs whose path ends with these strings get the longer filter-options TTL
const OPTIONS_URL_HINTS = ['/filter-options', '/filter_options'];

// ─── Internal store ──────────────────────────────────────────────────────────
/** @type {Map<string, { data: any, exp: number }>} */
const _cache = new Map();

// ─── Helpers ─────────────────────────────────────────────────────────────────
function _key(url, config) {
  // Include the last 16 chars of the bearer token so different users never
  // share cached responses, but avoid storing the full token in a map key.
  const auth = (config?.headers?.Authorization || config?.headers?.authorization || '').slice(-16);
  return `${url}::${auth}`;
}

function _ttl(url) {
  return OPTIONS_URL_HINTS.some(h => url.includes(h)) ? OPTIONS_TTL : DEFAULT_TTL;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Cached GET. Returns the cached response object `{ data }` if still fresh,
 * otherwise fetches via axios and stores the result.
 */
async function get(url, config) {
  const key = _key(url, config);
  const entry = _cache.get(key);
  if (entry && Date.now() < entry.exp) {
    return entry.data;          // cache hit — return stored response object
  }
  const response = await axios.get(url, config);
  _cache.set(key, { data: response, exp: Date.now() + _ttl(url) });
  return response;
}

/**
 * Remove all cache entries whose key starts with `prefix`.
 * Call this after a successful data upload so the next fetch is always fresh.
 *
 * Example: clearByPrefix('/api/placement') wipes all placement caches.
 */
function clearByPrefix(prefix) {
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) _cache.delete(key);
  }
}

/** Remove every entry — called from DataUploadModal after a successful upload. */
function clearAll() {
  _cache.clear();
}

// Re-export all other axios methods unchanged so this is a drop-in replacement
const cachedAxios = {
  get,
  post:   axios.post.bind(axios),
  put:    axios.put.bind(axios),
  delete: axios.delete.bind(axios),
  patch:  axios.patch.bind(axios),
  clearByPrefix,
  clearAll,
};

export default cachedAxios;
