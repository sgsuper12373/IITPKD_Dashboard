"""Feedback submission gated behind email OTP + math CAPTCHA.

Open to everyone — authorized users, the shared guest account, and fully
unauthenticated visitors. Identity is established by the OTP itself: whoever
controls the email inbox proves ownership of the address the feedback is
attributed to. Logged-in (non-guest) users skip straight to the OTP using their
account email; guests type their own address and verify it the same way.

Flow:

    POST /api/feedback/start   → email a 6-digit OTP, return a math CAPTCHA question
    POST /api/feedback/verify  → check OTP + CAPTCHA (no consume) so the UI can reveal the form
    POST /api/feedback/submit  → re-check OTP + CAPTCHA, validate the image, relay to the Sheet

The browser never talks to the Google Apps Script directly anymore. This server is
the enforcement point: it verifies the OTP/CAPTCHA, sanitises the screenshot, and
only then relays a cleaned payload to the Apps Script (which additionally rejects
anything missing the shared secret).
"""
import base64
import os
import re
import secrets

import requests
from flask import Blueprint, current_app, jsonify, request

from . import bcrypt, limiter
from .auth import token_optional
from .db import get_db_connection, release_db_connection
from .image_safety import ImageRejected, validate_and_reencode
from .mailer import send_otp_email

feedback_bp = Blueprint('feedback', __name__)

OTP_TTL_MINUTES = 10        # how long a code stays valid
MAX_ATTEMPTS = 5            # failed OTP/CAPTCHA tries before the row is dead
RESEND_COOLDOWN_SECONDS = 60  # min gap between OTP emails for one email address
MAX_OTPS_PER_HOUR = 5       # cap OTP emails per email address per hour

# Pragmatic email shape check — real validation is the OTP delivery itself.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _get_user(cur, user_id):
    """Returns the user's row (id, email, role_id) or None."""
    cur.execute("SELECT id, email, role_id FROM users WHERE id = %s;", (user_id,))
    return cur.fetchone()


def _is_shared_guest(email):
    """True if this is the shared read-only guest account."""
    guest_email = os.environ.get('GUEST_USER_NAME', '')
    return bool(guest_email) and email == guest_email


def _valid_email(email):
    """A lightweight format guard; OTP delivery is the real verification."""
    return bool(email) and len(email) <= 254 and _EMAIL_RE.match(email) is not None


def _resolve_identity(cur, current_user_id, data):
    """
    Decides which email the OTP is bound to for a /start request.

    A logged-in, non-guest user always verifies their own account email — a
    client-supplied address is ignored so a session can't email codes elsewhere.
    Everyone else (the shared guest account or an unauthenticated visitor) must
    supply a valid email manually. Returns (email, user_id, error); one of email
    or error is None.
    """
    user = _get_user(cur, current_user_id) if current_user_id else None
    if user and not _is_shared_guest(user['email']):
        return user['email'], user['id'], None

    email = (data.get('email') or '').strip().lower()
    if not _valid_email(email):
        return None, None, 'Please enter a valid email address.'
    # Keep the guest account's user_id for reference; anonymous visitors get None.
    return email, (user['id'] if user else None), None


def _make_captcha():
    """Returns (question, answer) for a simple single-digit addition challenge."""
    a = secrets.randbelow(9) + 1
    b = secrets.randbelow(9) + 1
    return f"{a} + {b}", a + b


def _load_active_row(cur, verification_id):
    """
    Loads a verification row that is still usable (exists, not consumed, not
    expired, attempts left). The verification_id is an unguessable secret token,
    so possessing it (plus the emailed OTP and CAPTCHA) is the binding — no
    separate user check is needed, which is what lets the guest flow work.
    Returns (row, error_message). One of them is None.
    """
    cur.execute(
        """
        SELECT verification_id, user_id, email, otp_hash, captcha_answer, attempts, consumed,
               (expires_at < NOW()) AS expired
        FROM feedback_verification
        WHERE verification_id = %s;
        """,
        (verification_id,),
    )
    row = cur.fetchone()
    if not row:
        return None, 'Verification not found. Please restart.'
    if row['consumed']:
        return None, 'This code was already used. Please restart.'
    if row['expired']:
        return None, 'This code has expired. Please request a new one.'
    if row['attempts'] >= MAX_ATTEMPTS:
        return None, 'Too many incorrect attempts. Please request a new code.'
    return row, None


def _check_otp_and_captcha(row, otp, captcha_answer):
    """Returns True if both the OTP and CAPTCHA answer match the stored row."""
    try:
        captcha_ok = int(captcha_answer) == row['captcha_answer']
    except (TypeError, ValueError):
        captcha_ok = False
    otp_ok = bool(otp) and bcrypt.check_password_hash(row['otp_hash'], str(otp).strip())
    return otp_ok and captcha_ok


# ── POST /api/feedback/start ─────────────────────────────────────────────────

@feedback_bp.route('/start', methods=['POST'])
@limiter.limit("5 per minute")
@limiter.limit("20 per hour")
@token_optional
def start(current_user_id):
    """Emails an OTP to the resolved address and returns a CAPTCHA + verification id.

    Open to guests; the per-IP limiter above caps how many distinct addresses a
    single client can email codes to (anti-bombing), on top of the per-email
    cooldown/cap below.
    """
    data = request.get_json(silent=True) or {}
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed.'}), 503
    try:
        cur = conn.cursor()
        email, user_id, err = _resolve_identity(cur, current_user_id, data)
        if err:
            return jsonify({'message': err}), 400

        # Rate limiting keyed by destination email: cooldown between sends + hourly cap.
        cur.execute(
            """
            SELECT
              COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')           AS last_hour,
              COUNT(*) FILTER (WHERE created_at > NOW() - (%s * INTERVAL '1 second')
                               AND NOT consumed)                                        AS recent
            FROM feedback_verification WHERE email = %s;
            """,
            (RESEND_COOLDOWN_SECONDS, email),
        )
        counts = cur.fetchone()
        if counts['recent'] and counts['recent'] > 0:
            return jsonify({'message': 'Please wait a minute before requesting another code.'}), 429
        if counts['last_hour'] and counts['last_hour'] >= MAX_OTPS_PER_HOUR:
            return jsonify({'message': 'Too many requests. Please try again later.'}), 429

        code = f"{secrets.randbelow(900000) + 100000}"  # 6 digits, no leading zero
        otp_hash = bcrypt.generate_password_hash(code).decode('utf-8')
        question, answer = _make_captcha()
        verification_id = secrets.token_urlsafe(24)

        cur.execute(
            """
            INSERT INTO feedback_verification
                (verification_id, user_id, email, otp_hash, captcha_answer, expires_at)
            VALUES (%s, %s, %s, %s, %s, NOW() + (%s * INTERVAL '1 minute'));
            """,
            (verification_id, user_id, email, otp_hash, answer, OTP_TTL_MINUTES),
        )
        conn.commit()

        if not send_otp_email(email, code):
            # Roll the row back so the cooldown doesn't lock out a retry after a mail failure.
            cur.execute("DELETE FROM feedback_verification WHERE verification_id = %s;", (verification_id,))
            conn.commit()
            return jsonify({'message': 'Could not send the verification email. Please try again.'}), 502

        return jsonify({
            'verification_id': verification_id,
            'captcha_question': question,
            'email': email,
        }), 200
    except Exception as exc:
        conn.rollback()
        print(f"Feedback start error: {exc}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        cur.close()
        release_db_connection(conn)


# ── POST /api/feedback/verify ────────────────────────────────────────────────

@feedback_bp.route('/verify', methods=['POST'])
@token_optional
def verify(current_user_id):
    """Checks the OTP + CAPTCHA without consuming the code (gates the UI reveal)."""
    data = request.get_json(silent=True) or {}
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed.'}), 503
    try:
        cur = conn.cursor()
        row, err = _load_active_row(cur, data.get('verification_id'))
        if err:
            return jsonify({'message': err}), 400

        if not _check_otp_and_captcha(row, data.get('otp'), data.get('captcha_answer')):
            cur.execute(
                "UPDATE feedback_verification SET attempts = attempts + 1 WHERE verification_id = %s;",
                (row['verification_id'],),
            )
            conn.commit()
            return jsonify({'message': 'Incorrect code or CAPTCHA answer.'}), 400

        return jsonify({'ok': True}), 200
    except Exception as exc:
        conn.rollback()
        print(f"Feedback verify error: {exc}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        cur.close()
        release_db_connection(conn)


# ── POST /api/feedback/submit ────────────────────────────────────────────────

@feedback_bp.route('/submit', methods=['POST'])
@token_optional
def submit(current_user_id):
    """Authoritative check + image sanitisation, then relay to the Google Sheet."""
    data = request.get_json(silent=True) or {}
    feedback_text = (data.get('feedback') or '').strip()
    if not feedback_text:
        return jsonify({'message': 'Feedback text is required.'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed.'}), 503
    try:
        cur = conn.cursor()
        row, err = _load_active_row(cur, data.get('verification_id'))
        if err:
            return jsonify({'message': err}), 400
        if not _check_otp_and_captcha(row, data.get('otp'), data.get('captcha_answer')):
            cur.execute(
                "UPDATE feedback_verification SET attempts = attempts + 1 WHERE verification_id = %s;",
                (row['verification_id'],),
            )
            conn.commit()
            return jsonify({'message': 'Incorrect code or CAPTCHA answer.'}), 400

        # Sanitise the optional screenshot (decode → validate → re-encode).
        screenshot_b64, screenshot_name, screenshot_type = '', '', ''
        if data.get('screenshot'):
            try:
                raw = base64.b64decode(data['screenshot'], validate=True)
            except Exception:
                return jsonify({'message': 'Screenshot could not be decoded.'}), 400
            try:
                clean_bytes, screenshot_type, ext = validate_and_reencode(raw)
            except ImageRejected as rej:
                return jsonify({'message': str(rej)}), 400
            screenshot_b64 = base64.b64encode(clean_bytes).decode('ascii')
            screenshot_name = f"feedback_{secrets.token_hex(6)}.{ext}"

        # Single-use: consume the code before relaying so a retry can't double-post.
        cur.execute(
            "UPDATE feedback_verification SET consumed = TRUE WHERE verification_id = %s;",
            (row['verification_id'],),
        )
        conn.commit()

        script_url = os.environ.get('FEEDBACK_SCRIPT_URL', '')
        shared_secret = os.environ.get('FEEDBACK_SHARED_SECRET', '')
        if not script_url or not shared_secret:
            return jsonify({'message': 'Feedback relay is not configured on this server.'}), 500

        try:
            requests.post(
                script_url,
                json={
                    'secret': shared_secret,
                    'name': (data.get('name') or '').strip() or 'Anonymous',
                    'email': row['email'],
                    'feedback': feedback_text,
                    'screenshot': screenshot_b64,
                    'screenshotName': screenshot_name,
                    'screenshotType': screenshot_type,
                },
                timeout=15,
            )
        except requests.RequestException as exc:
            print(f"Feedback relay error: {exc}")
            return jsonify({'message': 'Could not deliver feedback. Please try again later.'}), 502

        return jsonify({'message': 'Feedback submitted successfully.'}), 200
    except Exception as exc:
        conn.rollback()
        print(f"Feedback submit error: {exc}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        cur.close()
        release_db_connection(conn)
