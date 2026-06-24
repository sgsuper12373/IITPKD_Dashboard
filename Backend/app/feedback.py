"""Feedback submission gated behind email OTP + math CAPTCHA.

Flow (all endpoints require a valid login token):

    POST /api/feedback/start   → email a 6-digit OTP, return a math CAPTCHA question
    POST /api/feedback/verify  → check OTP + CAPTCHA (no consume) so the UI can reveal the form
    POST /api/feedback/submit  → re-check OTP + CAPTCHA, validate the image, relay to the Sheet

The browser never talks to the Google Apps Script directly anymore. This server is
the enforcement point: it authenticates the submitter, verifies the OTP/CAPTCHA,
sanitises the screenshot, and only then relays a cleaned payload to the Apps Script
(which additionally rejects anything missing the shared secret).
"""
import base64
import os
import secrets

import requests
from flask import Blueprint, current_app, jsonify, request

from . import bcrypt
from .auth import token_required
from .db import get_db_connection, release_db_connection
from .image_safety import ImageRejected, validate_and_reencode
from .mailer import send_otp_email

feedback_bp = Blueprint('feedback', __name__)

OTP_TTL_MINUTES = 10        # how long a code stays valid
MAX_ATTEMPTS = 5            # failed OTP/CAPTCHA tries before the row is dead
RESEND_COOLDOWN_SECONDS = 60  # min gap between OTP emails for one user
MAX_OTPS_PER_HOUR = 5       # cap OTP emails per user per hour


def _get_user(cur, user_id):
    """Returns the user's row (id, email, role_id) or None."""
    cur.execute("SELECT id, email, role_id FROM users WHERE id = %s;", (user_id,))
    return cur.fetchone()


def _is_shared_guest(email):
    """True if this is the shared read-only guest account (mirrors the frontend gate)."""
    guest_email = os.environ.get('GUEST_USER_NAME', '')
    return bool(guest_email) and email == guest_email


def _make_captcha():
    """Returns (question, answer) for a simple single-digit addition challenge."""
    a = secrets.randbelow(9) + 1
    b = secrets.randbelow(9) + 1
    return f"{a} + {b}", a + b


def _load_active_row(cur, verification_id, user_id):
    """
    Loads a verification row that is still usable (right user, not consumed,
    not expired, attempts left). Returns (row, error_message). One of them is None.
    """
    cur.execute(
        """
        SELECT verification_id, user_id, otp_hash, captcha_answer, attempts, consumed,
               (expires_at < NOW()) AS expired
        FROM feedback_verification
        WHERE verification_id = %s;
        """,
        (verification_id,),
    )
    row = cur.fetchone()
    if not row or row['user_id'] != user_id:
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
@token_required
def start(current_user_id):
    """Emails an OTP to the logged-in user and returns a CAPTCHA + verification id."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed.'}), 503
    try:
        cur = conn.cursor()
        user = _get_user(cur, current_user_id)
        if not user:
            return jsonify({'message': 'User not found.'}), 404
        if _is_shared_guest(user['email']):
            return jsonify({'message': 'Guests cannot submit feedback.'}), 403

        # Rate limiting: cooldown between sends + hourly cap per user.
        cur.execute(
            """
            SELECT
              COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')           AS last_hour,
              COUNT(*) FILTER (WHERE created_at > NOW() - (%s * INTERVAL '1 second')
                               AND NOT consumed)                                        AS recent
            FROM feedback_verification WHERE user_id = %s;
            """,
            (RESEND_COOLDOWN_SECONDS, current_user_id),
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
                (verification_id, user_id, otp_hash, captcha_answer, expires_at)
            VALUES (%s, %s, %s, %s, NOW() + (%s * INTERVAL '1 minute'));
            """,
            (verification_id, current_user_id, otp_hash, answer, OTP_TTL_MINUTES),
        )
        conn.commit()

        if not send_otp_email(user['email'], code):
            # Roll the row back so the cooldown doesn't lock out a retry after a mail failure.
            cur.execute("DELETE FROM feedback_verification WHERE verification_id = %s;", (verification_id,))
            conn.commit()
            return jsonify({'message': 'Could not send the verification email. Please try again.'}), 502

        return jsonify({
            'verification_id': verification_id,
            'captcha_question': question,
            'email': user['email'],
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
@token_required
def verify(current_user_id):
    """Checks the OTP + CAPTCHA without consuming the code (gates the UI reveal)."""
    data = request.get_json(silent=True) or {}
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed.'}), 503
    try:
        cur = conn.cursor()
        row, err = _load_active_row(cur, data.get('verification_id'), current_user_id)
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
@token_required
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
        user = _get_user(cur, current_user_id)
        if not user:
            return jsonify({'message': 'User not found.'}), 404
        if _is_shared_guest(user['email']):
            return jsonify({'message': 'Guests cannot submit feedback.'}), 403

        row, err = _load_active_row(cur, data.get('verification_id'), current_user_id)
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
                    'email': user['email'],
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
