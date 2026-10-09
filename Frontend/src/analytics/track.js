/**
 * Anonymous visit tracking. Sends only: the public page path, the previous page
 * path, a random per-tab session id, and short click-target labels. No cookies,
 * no user id, no tokens (plain fetch — never axios, which attaches auth headers).
 * Honours Do-Not-Track / Global Privacy Control; every failure is swallowed.
 */
import { isKnownPath, normalizePath } from '../home/exploreMap';

const ENDPOINT = `${import.meta.env.VITE_API_BASE_URL}/api/analytics/event`;
const TARGET_RE = /^[a-z0-9_-]{1,40}$/;

let memorySession = null;

const optedOut = () =>
  typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true);

function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function sessionId() {
  try {
    let id = sessionStorage.getItem('ana_sid');
    if (!id) {
      id = randomId();
      sessionStorage.setItem('ana_sid', id);
    }
    return id;
  } catch {
    memorySession = memorySession || randomId();
    return memorySession;
  }
}

function send(payload) {
  if (optedOut()) return;
  try {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, session: sessionId() }),
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {});
  } catch { /* tracking must never affect the page */ }
}

const trackablePath = (p) => p === '/' || isKnownPath(p);

export function trackPageView(pathname, fromPathname) {
  const path = normalizePath(pathname);
  if (!trackablePath(path)) return;
  const from = normalizePath(fromPathname || '');
  send({ event: 'pageview', path, from: trackablePath(from) ? from : undefined });
}

export function trackClick(target, pathname) {
  if (!TARGET_RE.test(target || '')) return;
  const path = normalizePath(pathname);
  if (!trackablePath(path)) return;
  send({ event: 'click', path, target });
}
