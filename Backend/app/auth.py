"""Authentication: JWT helpers, decorator, and user management routes."""
import datetime
import os
import secrets
from datetime import timezone
from functools import wraps

import jwt
import psycopg2.errors
from flask import Blueprint, jsonify, request, current_app
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from .db import get_db_connection, release_db_connection
from . import bcrypt, limiter

auth_bp = Blueprint('auth', __name__)


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def encode_auth_token(user_id, role_id):
    """Creates a signed JWT valid for 24 hours. Returns the token string or None."""
    try:
        now = datetime.datetime.now(timezone.utc)
        payload = {
            'sub': str(user_id),
            'role': role_id,
            'iat': int(now.timestamp()),
            'exp': int((now + datetime.timedelta(hours=24)).timestamp()),
        }
        return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')
    except Exception as e:
        print(f"Token encoding error: {e}")
        return None


def decode_auth_token(token):
    """
    Decodes a JWT. Returns the integer user_id on success,
    or an error message string on failure.
    """
    try:
        secret = current_app.config['SECRET_KEY']
        payload = jwt.decode(token, secret, algorithms=['HS256'], leeway=10)
        return int(payload['sub'])
    except jwt.ExpiredSignatureError:
        return 'Token expired. Please log in again.'
    except jwt.InvalidTokenError:
        return 'Invalid token. Please log in again.'
    except Exception:
        return 'Error validating token. Please log in again.'


def _is_account_active(user_id):
    """
    Re-reads the account's current status from the database.

    Returns True only if the account still exists and is 'active'. This is
    what makes suspension/deactivation take effect immediately instead of
    only at the next login — the JWT itself is not re-issued when an admin
    changes a user's status, so it must be checked per request.
    """
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return False
        cur = conn.cursor()
        cur.execute("SELECT status FROM users WHERE id = %s;", (user_id,))
        row = cur.fetchone()
        cur.close()
        if not row:
            return False
        status = row.get('status')
        return not status or status == 'active'
    except Exception as e:
        print(f"Account status check error: {e}")
        return False
    finally:
        if conn:
            release_db_connection(conn)


def token_required(f):
    """Route decorator that checks for a valid Bearer token in the Authorization header
    and that the account it belongs to is still active."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        parts = auth_header.split()
        if len(parts) == 2 and parts[0].lower() == 'bearer':
            token = parts[1]
        elif not auth_header:
            return jsonify({'message': 'Token is missing! Please log in again.'}), 401
        else:
            return jsonify({'message': 'Invalid Authorization header format!'}), 401

        user_id = decode_auth_token(token)
        if isinstance(user_id, str):
            return jsonify({'message': user_id}), 401

        if not _is_account_active(user_id):
            return jsonify({'message': 'Account is not active. Please contact an administrator.'}), 401

        kwargs['current_user_id'] = user_id
        return f(*args, **kwargs)

    return decorated


def token_optional(f):
    """Route decorator that validates a token if present, allows the request if absent.
    Use on public/read-only endpoints that should also work for unauthenticated users.
    A token for a since-suspended account is treated as anonymous rather than an error,
    since these routes already permit anonymous access."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        parts = auth_header.split()
        if (len(parts) == 2 and parts[0].lower() == 'bearer'
                and parts[1].lower() not in ('null', 'undefined', '')):
            user_id = decode_auth_token(parts[1])
            if isinstance(user_id, str):
                return jsonify({'message': user_id}), 401
            kwargs['current_user_id'] = user_id if _is_account_active(user_id) else None
        else:
            kwargs['current_user_id'] = None
        return f(*args, **kwargs)

    return decorated


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    """Validates credentials and returns a JWT on success."""
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Email and password are required!'}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, email, display_name, role_id, status, password_hash, failed_login_attempts, last_failed_at, created_at FROM users WHERE email = %s;", (data['email'],))
        user = cur.fetchone()

        if not user:
            return jsonify({'message': 'Invalid email or password.'}), 401

        max_attempts = int(os.environ.get('MAX_LOGIN_ATTEMPTS', '10'))
        lockout_minutes = int(os.environ.get('LOCKOUT_DURATION_MINUTES', '30'))
        failed = user.get('failed_login_attempts') or 0
        if failed >= max_attempts:
            last_attempt = user.get('last_failed_at')
            if last_attempt:
                elapsed = (datetime.datetime.now(timezone.utc) - last_attempt.replace(tzinfo=timezone.utc)).total_seconds()
                if elapsed < lockout_minutes * 60:
                    remaining = int((lockout_minutes * 60 - elapsed) / 60) + 1
                    return jsonify({'message': f'Account locked due to too many failed attempts. Try again in {remaining} minutes.'}), 429
                cur.execute("UPDATE users SET failed_login_attempts = 0 WHERE id = %s;", (user['id'],))
                conn.commit()
            else:
                return jsonify({'message': f'Account locked due to too many failed attempts. Try again in {lockout_minutes} minutes.'}), 429

        if not bcrypt.check_password_hash(user['password_hash'], data['password']):
            cur.execute(
                "UPDATE users SET failed_login_attempts = failed_login_attempts + 1, last_failed_at = NOW() WHERE id = %s;",
                (user['id'],),
            )
            conn.commit()
            return jsonify({'message': 'Invalid email or password.'}), 401

        if user.get('status') and user['status'] != 'active':
            return jsonify({'message': 'Account is not active. Please contact an administrator.'}), 403

        cur.execute(
            "UPDATE users SET last_login_at = NOW(), failed_login_attempts = 0 WHERE id = %s;",
            (user['id'],)
        )
        conn.commit()

        del user['password_hash']
        return jsonify({
            'message': 'Login successful!',
            'token': encode_auth_token(user['id'], user['role_id']),
            'user': user,
        }), 200
    finally:
        if conn:
            cur.close()
            release_db_connection(conn)


# ---------------------------------------------------------------------------
# Google OAuth route
# ---------------------------------------------------------------------------

_GOOGLE_ISSUERS = {'accounts.google.com', 'https://accounts.google.com'}


@auth_bp.route('/google', methods=['POST'])
@limiter.limit("10 per minute")
def google_login():
    """Verifies a Google ID token and returns a JWT. Any verified Google account is accepted."""
    data = request.get_json()
    if not data or not data.get('credential'):
        return jsonify({'message': 'Google credential is required.'}), 400

    client_id = current_app.config.get('GOOGLE_CLIENT_ID', '')
    if not client_id:
        return jsonify({'message': 'Google OAuth is not configured on this server.'}), 500

    try:
        idinfo = google_id_token.verify_oauth2_token(
            data['credential'],
            google_requests.Request(),
            client_id,
            clock_skew_in_seconds=120,
        )
    except ValueError as e:
        print(f"Google token verification failed: {e}")
        return jsonify({'message': 'Invalid Google token. Please try again.'}), 401

    if idinfo.get('iss') not in _GOOGLE_ISSUERS:
        return jsonify({'message': 'Invalid token issuer.'}), 401

    if not idinfo.get('email_verified'):
        return jsonify({'message': 'Google account email is not verified.'}), 401

    email = idinfo['email']
    display_name = idinfo.get('name', email.split('@')[0])

    allowed_domains = os.environ.get('OAUTH_ALLOWED_DOMAINS', 'iitpkd.ac.in').split(',')
    email_domain = email.rsplit('@', 1)[-1].lower()
    if email_domain not in allowed_domains:
        return jsonify({'message': 'Only institutional email accounts are allowed.'}), 403

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT id, email, display_name, role_id, status, password_hash, created_at FROM users WHERE email = %s;", (email,))
        user = cur.fetchone()

        if not user:
            # First login: create the user as pending, not active — matching the
            # password-account flow (/auth/create-user), an admin still has to
            # approve any new account before it can use the dashboard, even one
            # from a verified institutional Google identity (M3). A random hash
            # satisfies NOT NULL while preventing password-based login for this
            # OAuth-only account.
            dummy_hash = bcrypt.generate_password_hash(
                secrets.token_urlsafe(32)
            ).decode('utf-8')
            cur.execute(
                """
                INSERT INTO users (email, password_hash, display_name, role_id, status)
                VALUES (%s, %s, %s, 0, 'pending_verification')
                RETURNING id, email, display_name, role_id, status, created_at;
                """,
                (email, dummy_hash, display_name),
            )
            user = dict(cur.fetchone())
            conn.commit()
            return jsonify({
                'message': 'Account created. An administrator must activate it before you can sign in.',
            }), 403
        else:
            if user.get('status') and user['status'] != 'active':
                return jsonify({'message': 'Account is not active. Please contact an administrator.'}), 403

            cur.execute(
                "UPDATE users SET last_login_at = NOW() WHERE id = %s;",
                (user['id'],),
            )
            conn.commit()
            user = dict(user)
            user.pop('password_hash', None)

        return jsonify({
            'message': 'Login successful!',
            'token': encode_auth_token(user['id'], user['role_id']),
            'user': user,
        }), 200

    finally:
        if conn:
            cur.close()
            release_db_connection(conn)


# ---------------------------------------------------------------------------
# Guest login route
# ---------------------------------------------------------------------------

@auth_bp.route('/guest', methods=['POST'])
@limiter.limit("10 per minute")
def guest_login():
    """Logs in the pre-configured guest account whose credentials live in .env."""
    guest_email = os.environ.get('GUEST_USER_NAME', '')
    guest_password = os.environ.get('GUEST_USER_PASSWORD', '')
    if not guest_email or not guest_password:
        return jsonify({'message': 'Guest login is not configured on this server.'}), 500

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, email, display_name, role_id, status, password_hash, created_at FROM users WHERE email = %s;",
            (guest_email,)
        )
        user = cur.fetchone()

        if not user:
            return jsonify({'message': 'Guest account not found.'}), 404

        if not bcrypt.check_password_hash(user['password_hash'], guest_password):
            return jsonify({'message': 'Guest login configuration error.'}), 500

        cur.execute("UPDATE users SET last_login_at = NOW() WHERE id = %s;", (user['id'],))
        conn.commit()

        user = dict(user)
        user.pop('password_hash', None)
        return jsonify({
            'message': 'Login successful!',
            'token': encode_auth_token(user['id'], user['role_id']),
            'user': user,
        }), 200
    finally:
        if conn:
            cur.close()
            release_db_connection(conn)


# ---------------------------------------------------------------------------
# Admin routes (role_id == 3 required)
# ---------------------------------------------------------------------------

def _require_admin(cur, user_id):
    """Returns the user row if admin, else raises a 403 response tuple."""
    cur.execute("SELECT role_id FROM users WHERE id = %s;", (user_id,))
    user = cur.fetchone()
    if not user or user['role_id'] != 3:
        return None
    return user


@auth_bp.route('/roles', methods=['GET'])
@token_required
def get_roles(current_user_id):
    """Returns all available roles. Admin only."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if not _require_admin(cur, current_user_id):
            return jsonify({'message': 'Admin access required'}), 403
        cur.execute("SELECT id, name FROM roles ORDER BY id;")
        return jsonify(cur.fetchall()), 200
    finally:
        cur.close()
        release_db_connection(conn)


@auth_bp.route('/roles/<int:role_id>', methods=['PUT'])
@token_required
def update_role(current_user_id, role_id):
    """Updates the name of an existing role. Admin only."""
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'message': 'Role name is required'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if not _require_admin(cur, current_user_id):
            return jsonify({'message': 'Admin access required'}), 403
        cur.execute(
            "UPDATE roles SET name = %s WHERE id = %s RETURNING id, name;",
            (data['name'].strip(), role_id)
        )
        updated = cur.fetchone()
        if not updated:
            return jsonify({'message': 'Role not found'}), 404
        conn.commit()
        return jsonify(updated), 200
    except Exception as e:
        conn.rollback()
        print(f"Error updating role: {e}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        cur.close()
        release_db_connection(conn)


@auth_bp.route('/roles', methods=['POST'])
@token_required
def create_role(current_user_id):
    """Creates a new role with an explicit id. Admin only."""
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'message': 'Role name is required'}), 400
    if data.get('id') is None:
        return jsonify({'message': 'Role id is required'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if not _require_admin(cur, current_user_id):
            return jsonify({'message': 'Admin access required'}), 403
        cur.execute(
            "INSERT INTO roles (id, name) VALUES (%s, %s) RETURNING id, name;",
            (int(data['id']), data['name'].strip())
        )
        new_role = cur.fetchone()
        conn.commit()
        return jsonify(new_role), 201
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return jsonify({'message': 'A role with that id or name already exists'}), 409
    except Exception as e:
        conn.rollback()
        print(f"Error creating role: {e}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        cur.close()
        release_db_connection(conn)


@auth_bp.route('/roles/<int:role_id>', methods=['DELETE'])
@token_required
def delete_role(current_user_id, role_id):
    """Deletes a role. Refuses if any users are still assigned to it. Admin only."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if not _require_admin(cur, current_user_id):
            return jsonify({'message': 'Admin access required'}), 403

        # Safety check: don't delete roles that are in use
        cur.execute("SELECT COUNT(*) AS cnt FROM users WHERE role_id = %s;", (role_id,))
        count = cur.fetchone()['cnt']
        if count > 0:
            return jsonify({'message': f'Cannot delete: {count} user(s) still assigned to this role'}), 409

        cur.execute("DELETE FROM roles WHERE id = %s RETURNING id;", (role_id,))
        deleted = cur.fetchone()
        if not deleted:
            return jsonify({'message': 'Role not found'}), 404
        conn.commit()
        return jsonify({'message': 'Role deleted successfully'}), 200
    except Exception as e:
        conn.rollback()
        print(f"Error deleting role: {e}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        cur.close()
        release_db_connection(conn)


@auth_bp.route('/create-user', methods=['POST'])
@limiter.limit("20 per hour")
@token_required
def create_user(current_user_id):
    """Creates a new user account. Admin only."""
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if not _require_admin(cur, current_user_id):
            return jsonify({'message': 'Admin access required'}), 403

        hashed = bcrypt.generate_password_hash(data['password']).decode('utf-8')
        cur.execute(
            """
            INSERT INTO users (email, password_hash, username, display_name, role_id, status)
            VALUES (%s, %s, %s, %s, %s, 'pending_verification')
            RETURNING id, email, username, display_name, role_id;
            """,
            (data['email'], hashed, data['username'], data.get('display_name'), data['role_id'])
        )
        new_user = cur.fetchone()
        conn.commit()
        return jsonify({'message': 'User created successfully', 'user': new_user}), 201
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return jsonify({'message': 'Email or username already exists'}), 409
    finally:
        cur.close()
        release_db_connection(conn)

@auth_bp.route('/users', methods=['GET'])
@token_required
def get_users(current_user_id):
    """Returns all existing users. Admin only."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if not _require_admin(cur, current_user_id):
            return jsonify({'message': 'Admin access required'}), 403
            
        cur.execute("SELECT id, email, username, display_name, role_id, status FROM users ORDER BY id DESC;")
        users = cur.fetchall()
        return jsonify(users), 200
    except Exception as e:
        print(f"Error fetching users: {e}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        cur.close()
        release_db_connection(conn)


@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
@limiter.limit("30 per hour")
@token_required
def update_user(current_user_id, user_id):
    """Updates a user's role_id and optionally password. Admin only."""
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if not _require_admin(cur, current_user_id):
            return jsonify({'message': 'Admin access required'}), 403

        # Update role_id if provided
        if 'role_id' in data:
            cur.execute("UPDATE users SET role_id = %s WHERE id = %s;", (data['role_id'], user_id))
            
        # Update password if provided
        if 'password' in data and data['password'].strip():
            hashed = bcrypt.generate_password_hash(data['password']).decode('utf-8')
            cur.execute("UPDATE users SET password_hash = %s WHERE id = %s;", (hashed, user_id))
            
        conn.commit()
        return jsonify({'message': 'User updated successfully'}), 200
    except Exception as e:
        conn.rollback()
        print(f"Error updating user: {e}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        cur.close()
        release_db_connection(conn)
