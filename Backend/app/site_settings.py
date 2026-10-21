"""Simple key-value site settings (homepage section visibility, etc.).

GET  /              public  — returns all settings as {key: value}
PUT  /<key>         role 3  — upsert one setting
"""
from flask import Blueprint, jsonify, request

from . import limiter
from .auth import token_optional, token_required, _require_admin
from .db import get_db_connection, release_db_connection

site_settings_bp = Blueprint('site_settings', __name__)

_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS site_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""

DEFAULTS = {
    'show_image_slider': 'true',
    'show_nirf': 'true',
}


def _ensure_table(conn):
    cur = conn.cursor()
    cur.execute(_CREATE_TABLE_SQL)
    conn.commit()
    cur.close()


@site_settings_bp.route('/', methods=['GET'])
@token_optional
def get_settings(current_user_id):
    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify(DEFAULTS), 200
        _ensure_table(conn)
        cur = conn.cursor()
        cur.execute("SELECT key, value FROM site_settings;")
        rows = cur.fetchall()
        cur.close()
        result = dict(DEFAULTS)
        for row in rows:
            result[row['key']] = row['value']
        return jsonify(result), 200
    except Exception as e:
        print(f"Error fetching site settings: {e}")
        return jsonify(DEFAULTS), 200
    finally:
        if conn:
            release_db_connection(conn)


@site_settings_bp.route('/<key>', methods=['PUT'])
@token_required
@limiter.limit("30 per minute")
def update_setting(current_user_id, key):
    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed'}), 500
        _ensure_table(conn)
        import psycopg2.extras
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        admin = _require_admin(cur, current_user_id)
        if not admin:
            return jsonify({'message': 'Admin access required'}), 403

        body = request.get_json(silent=True) or {}
        value = str(body.get('value', ''))

        cur.execute(
            """INSERT INTO site_settings (key, value, updated_at)
               VALUES (%s, %s, now())
               ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();""",
            (key, value)
        )
        conn.commit()
        cur.close()
        return jsonify({'key': key, 'value': value}), 200
    except Exception as e:
        print(f"Error updating site setting: {e}")
        if conn:
            conn.rollback()
        return jsonify({'message': 'Failed to update setting'}), 500
    finally:
        if conn:
            release_db_connection(conn)
