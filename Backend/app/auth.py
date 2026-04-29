"""Authentication: JWT helpers, decorator, and user management routes."""
import datetime
from datetime import timezone
from functools import wraps

import jwt
import psycopg2.errors
from flask import Blueprint, jsonify, request, current_app

from .db import get_db_connection, release_db_connection
from . import bcrypt

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
            'exp': int((now + datetime.timedelta(days=30)).timestamp()),
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


def token_required(f):
    """Route decorator that checks for a valid Bearer token in the Authorization header."""
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

        kwargs['current_user_id'] = user_id
        return f(*args, **kwargs)

    return decorated


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """Registers a new user and returns a JWT."""
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Email and password are required!'}), 400

    hashed = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO users (email, password_hash, display_name, username)
            VALUES (%s, %s, %s, %s)
            RETURNING id, email, display_name, created_at, role_id;
            """,
            (data['email'], hashed, data.get('display_name'), data.get('username'))
        )
        new_user = cur.fetchone()
        conn.commit()
        return jsonify({
            'message': 'User created successfully!',
            'token': encode_auth_token(new_user['id'], new_user['role_id']),
            'user': new_user,
        }), 201
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return jsonify({'message': 'Email or username already exists.'}), 409
    finally:
        if conn:
            cur.close()
            release_db_connection(conn)


@auth_bp.route('/login', methods=['POST'])
def login():
    """Validates credentials and returns a JWT on success."""
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Email and password are required!'}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE email = %s;", (data['email'],))
        user = cur.fetchone()

        if not user:
            return jsonify({'message': 'Email not found.'}), 404

        if not bcrypt.check_password_hash(user['password_hash'], data['password']):
            return jsonify({'message': 'Incorrect password.'}), 401

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
        return jsonify({'message': str(e)}), 500
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
        return jsonify({'message': str(e)}), 500
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
        return jsonify({'message': str(e)}), 500
    finally:
        cur.close()
        release_db_connection(conn)


@auth_bp.route('/create-user', methods=['POST'])
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
        conn.close()

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
        return jsonify({'message': str(e)}), 500
    finally:
        cur.close()
        release_db_connection(conn)


@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
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
        return jsonify({'message': str(e)}), 500
    finally:
        cur.close()
        release_db_connection(conn)
