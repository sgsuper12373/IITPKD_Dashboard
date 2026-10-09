"""Admin-only read API over the security audit log (role_id 3 only)."""
import re

from flask import Blueprint, jsonify, request

from . import limiter
from .auth import _require_admin, token_required
from .db import get_db_connection, release_db_connection

security_bp = Blueprint('security', __name__)

_TYPE_RE = re.compile(r'^[a-z_]{1,60}$')
_FAIL_TYPES = ('login_failed', 'account_locked', 'access_denied', 'rate_limited', 'suspicious_request')


def _row(r):
    r = dict(r)
    r['occurred_at'] = r['occurred_at'].isoformat()
    return r


@security_bp.route('/summary', methods=['GET'])
@limiter.limit("60 per hour")
@token_required
def summary(current_user_id):
    try:
        hours = min(max(int(request.args.get('hours', 24)), 1), 24 * 30)
    except ValueError:
        hours = 24

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed.'}), 503
    cur = conn.cursor()
    try:
        if not _require_admin(cur, current_user_id):
            return jsonify({'message': 'Admin access required'}), 403

        window = "occurred_at >= now() - make_interval(hours => %s)"

        cur.execute(
            f"SELECT event_type, severity, COUNT(*) AS count FROM security_events WHERE {window} "
            "GROUP BY event_type, severity ORDER BY count DESC;", (hours,))
        by_type = cur.fetchall()

        cur.execute(
            f"""SELECT ip_address, COUNT(*) AS count, COUNT(DISTINCT event_type) AS kinds, MAX(occurred_at) AS last_seen
                FROM security_events WHERE {window} AND event_type = ANY(%s) AND ip_address IS NOT NULL
                GROUP BY ip_address ORDER BY count DESC LIMIT 10;""", (hours, list(_FAIL_TYPES)))
        top_ips = [{**dict(r), 'last_seen': r['last_seen'].isoformat()} for r in cur.fetchall()]

        cur.execute(
            f"""SELECT id, occurred_at, event_type, severity, ip_address, endpoint, user_id, email, detail
                FROM security_events WHERE {window} AND severity = 'high'
                ORDER BY occurred_at DESC LIMIT 20;""", (hours,))
        recent_high = [_row(r) for r in cur.fetchall()]

        return jsonify({'hours': hours, 'by_type': by_type, 'top_ips': top_ips, 'recent_high': recent_high}), 200
    except Exception as e:
        print(f"security summary error: {type(e).__name__}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        cur.close()
        release_db_connection(conn)


@security_bp.route('/events', methods=['GET'])
@limiter.limit("60 per hour")
@token_required
def events(current_user_id):
    try:
        limit = min(max(int(request.args.get('limit', 100)), 1), 200)
    except ValueError:
        limit = 100
    event_type = request.args.get('type')
    if event_type is not None and not _TYPE_RE.match(event_type):
        return jsonify({'message': 'Invalid event type.'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed.'}), 503
    cur = conn.cursor()
    try:
        if not _require_admin(cur, current_user_id):
            return jsonify({'message': 'Admin access required'}), 403
        cur.execute(
            """SELECT id, occurred_at, event_type, severity, ip_address, method, endpoint, status_code, user_id, email, detail
               FROM security_events WHERE (%s::text IS NULL OR event_type = %s)
               ORDER BY occurred_at DESC LIMIT %s;""", (event_type, event_type, limit))
        return jsonify({'events': [_row(r) for r in cur.fetchall()]}), 200
    except Exception as e:
        print(f"security events error: {type(e).__name__}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        cur.close()
        release_db_connection(conn)
