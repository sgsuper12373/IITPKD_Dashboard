"""
Output-side PII pattern redaction for free-text fields.

Some fields (publication titles, journal/faculty names, and similar) are
free text — entered by hand or via CSV upload — with no schema-level
guarantee against someone accidentally pasting something sensitive into
them. This deliberately does NOT scan/reject at write time: a blunt filter
there would risk rejecting legitimate data (an ISBN, a grant number, a DOI)
that happens to contain a long digit run. Instead it redacts matching
patterns from API *responses* only, so the application can never emit
something that looks like a card number or SSN in a given response,
independent of whatever ends up stored.
"""
import re

_SSN_PATTERN = re.compile(r'\b\d{3}-\d{2}-\d{4}\b')
# Card numbers are commonly typed/pasted with spaces or dashes grouping the
# digits (e.g. "4102 5396 4796 6" or "4102-5396-4796-6") — the previous
# pattern only matched an unbroken run of digits, so a formatted card number
# slipped through untouched. This matches 13-19 digits allowing single
# space/dash separators between them, then the surrounding code strips those
# separators before the Luhn check (which only makes sense on bare digits).
_DIGIT_RUN_PATTERN = re.compile(r'\b\d(?:[ -]?\d){12,18}\b')

REDACTED = '[redacted]'


def _luhn_valid(digits: str) -> bool:
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch)
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


def redact_pii_patterns(text):
    """
    Returns `text` with any SSN-shaped (XXX-XX-XXXX) sequence, or any
    Luhn-valid 13-19-digit sequence (optionally space/dash-separated),
    replaced with a redaction marker.

    Only Luhn-valid digit runs are redacted (not every long number in the
    text) specifically to avoid mangling legitimate identifiers — an ISBN,
    a grant number, a phone number — which essentially never coincidentally
    satisfy the Luhn checksum. Non-string input is returned unchanged.
    """
    if not isinstance(text, str) or not text:
        return text

    text = _SSN_PATTERN.sub(REDACTED, text)

    def _maybe_redact(m):
        bare_digits = re.sub(r'[ -]', '', m.group())
        return REDACTED if _luhn_valid(bare_digits) else m.group()

    return _DIGIT_RUN_PATTERN.sub(_maybe_redact, text)


def _redact_value(value):
    """Recurses into dicts/lists so a JSON/JSONB column (psycopg2 hands those
    back already deserialized into a dict/list, not a string) gets its
    nested string values checked too, not just top-level row columns."""
    if isinstance(value, str):
        return redact_pii_patterns(value)
    if isinstance(value, dict):
        return {k: _redact_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_redact_value(v) for v in value]
    return value


def redact_pii_in_row(row):
    """
    Applies redact_pii_patterns to every string value in a dict (typically
    one row from `[dict(r) for r in cur.fetchall()]`), recursing into any
    nested dict/list (e.g. a JSONB column psycopg2 already deserialized).
    Non-string, non-container values (dates, Decimal, int, bool, None) are
    left untouched. Returns a new dict; `row` is not mutated.

    Meant for endpoints that return an open-ended set of columns (a bare
    `SELECT *`, or a table whose free-text columns aren't worth naming one
    by one) where hand-picking which fields to redact would both miss
    columns today and silently stop covering new ones added later. Safe to
    apply even to columns that are never free text — redact_pii_patterns
    only touches substrings that are actually SSN/card-shaped, so a status
    or enum column simply passes through unchanged.
    """
    return {key: _redact_value(value) for key, value in row.items()}


def redact_pii_in_rows(rows):
    """redact_pii_in_row applied to every row in a list. See that docstring."""
    return [redact_pii_in_row(row) for row in rows]
