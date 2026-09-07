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
_DIGIT_RUN_PATTERN = re.compile(r'\b\d{13,19}\b')

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
    Luhn-valid 13-19-digit sequence, replaced with a redaction marker.

    Only Luhn-valid digit runs are redacted (not every long number in the
    text) specifically to avoid mangling legitimate identifiers — an ISBN,
    a grant number, a phone number — which essentially never coincidentally
    satisfy the Luhn checksum. Non-string input is returned unchanged.
    """
    if not isinstance(text, str) or not text:
        return text

    text = _SSN_PATTERN.sub(REDACTED, text)
    return _DIGIT_RUN_PATTERN.sub(
        lambda m: REDACTED if _luhn_valid(m.group()) else m.group(),
        text,
    )
