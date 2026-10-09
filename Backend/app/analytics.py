"""Anonymous visitor analytics: page views and click-through events.

Privacy design — no raw IP, no cookies, no user id is ever stored:
  * session_id   random per-tab id generated in the browser (sessionStorage)
  * visitor_hash HMAC(server secret, utc_date|ip), truncated — rotates daily so
                 a visitor cannot be followed across days, and cannot be reversed
  * is_campus    yes/no from CAMPUS_IP_RANGES (comma-separated CIDRs); the IP
                 itself is discarded
Requests with Do-Not-Track / Global Privacy Control, and obvious bots, are dropped.
"""
import datetime
import hashlib
import hmac
import ipaddress
import os
import re

from flask import Blueprint, current_app, jsonify, request

from . import limiter
from .auth import _require_admin, token_required
from .db import get_db_connection, release_db_connection

analytics_bp = Blueprint('analytics', __name__)

_PATH_RE = re.compile(r'^/[A-Za-z0-9_/-]{0,150}$')
_SESSION_RE = re.compile(r'^[A-Za-z0-9]{16,64}$')
_TARGET_RE = re.compile(r'^[a-z0-9_-]{1,40}$')
_EVENTS = ('pageview', 'click')
_BOT_RE = re.compile(r'bot|crawl|spider|slurp|headless|curl|wget|python-requests|monitor|uptime', re.IGNORECASE)


def _campus_networks():
    nets = []
    for part in os.environ.get('CAMPUS_IP_RANGES', '').split(','):
        part = part.strip()
        if not part:
            continue
        try:
            nets.append(ipaddress.ip_network(part, strict=False))
        except ValueError:
            print("analytics: ignoring invalid CAMPUS_IP_RANGES entry")
    return nets


_CAMPUS = _campus_networks()


def _is_campus(ip):
    if not _CAMPUS:
        return None
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return None
    return any(addr in net for net in _CAMPUS)


def _visitor_hash(ip):
    day = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')
    key = current_app.config['SECRET_KEY'].encode('utf-8')
    return hmac.new(key, f"visitor|{day}|{ip}".encode('utf-8'), hashlib.sha256).hexdigest()[:16]


def _clean_path(value):
    if value is None:
        return None
    if not isinstance(value, str) or not _PATH_RE.match(value):
        return False
    return value.rstrip('/') or '/'


@analytics_bp.route('/event', methods=['POST'])
@limiter.limit("120 per minute")
def record_event():
    """Records one page view or click. Always answers 204 so it can never be probed or break a page."""
    if request.headers.get('DNT') == '1' or request.headers.get('Sec-GPC') == '1':
        return '', 204
    if _BOT_RE.search(request.headers.get('User-Agent', '')):
        return '', 204

    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return '', 204

    event = body.get('event', 'pageview')
    session_id = body.get('session')
    path = _clean_path(body.get('path'))
    from_path = _clean_path(body.get('from'))
    target = body.get('target')

    if event not in _EVENTS or path in (None, False) or from_path is False:
        return '', 204
    if not isinstance(session_id, str) or not _SESSION_RE.match(session_id):
        return '', 204
    if event == 'click':
        if not isinstance(target, str) or not _TARGET_RE.match(target):
            return '', 204
    else:
        target = None

    ip = request.remote_addr or ''
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return '', 204
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO page_views (session_id, visitor_hash, event_type, path, from_path, target, is_campus)
            VALUES (%s, %s, %s, %s, %s, %s, %s);
            """,
            (session_id, _visitor_hash(ip), event, path, from_path, target, _is_campus(ip)),
        )
        conn.commit()
        cur.close()
    except Exception as e:
        print(f"analytics: insert failed: {type(e).__name__}")
        try:
            if conn:
                conn.rollback()
        except Exception:
            pass
    finally:
        if conn:
            release_db_connection(conn)
    return '', 204


def _f(v):
    return float(v) if v is not None else None


@analytics_bp.route('/summary', methods=['GET'])
@limiter.limit("60 per hour")
@token_required
def summary(current_user_id):
    """Aggregated visitor behaviour for the last N days. Admin only."""
    try:
        days = min(max(int(request.args.get('days', 30)), 1), 365)
    except ValueError:
        days = 30

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed.'}), 503
    cur = conn.cursor()
    try:
        if not _require_admin(cur, current_user_id):
            return jsonify({'message': 'Admin access required'}), 403

        since = "viewed_at >= now() - make_interval(days => %s)"

        cur.execute(
            f"""SELECT COUNT(*) AS views, COUNT(DISTINCT session_id) AS sessions,
                       COUNT(*) FILTER (WHERE is_campus) AS campus,
                       COUNT(*) FILTER (WHERE is_campus IS NOT NULL) AS campus_known
                FROM page_views WHERE event_type = 'pageview' AND {since};""", (days,))
        totals = cur.fetchone()

        cur.execute(
            f"""SELECT AVG(n) AS avg_pages, COUNT(*) FILTER (WHERE n = 1) AS single
                FROM (SELECT COUNT(*) AS n FROM page_views
                      WHERE event_type = 'pageview' AND {since} GROUP BY session_id) s;""", (days,))
        per_session = cur.fetchone()

        cur.execute(
            f"""SELECT date_trunc('day', viewed_at)::date AS day, COUNT(*) AS views,
                       COUNT(DISTINCT session_id) AS sessions
                FROM page_views WHERE event_type = 'pageview' AND {since}
                GROUP BY 1 ORDER BY 1;""", (days,))
        daily = [{'day': r['day'].isoformat(), 'views': r['views'], 'sessions': r['sessions']} for r in cur.fetchall()]

        cur.execute(
            f"""SELECT path, COUNT(*) AS views FROM page_views
                WHERE event_type = 'pageview' AND {since} GROUP BY path ORDER BY views DESC LIMIT 10;""", (days,))
        top_pages = cur.fetchall()

        def edge(order):
            cur.execute(
                f"""SELECT path, COUNT(*) AS sessions FROM (
                        SELECT DISTINCT ON (session_id) path FROM page_views
                        WHERE event_type = 'pageview' AND {since}
                        ORDER BY session_id, viewed_at {order}) e
                    GROUP BY path ORDER BY sessions DESC LIMIT 5;""", (days,))
            return cur.fetchall()

        entry_pages, exit_pages = edge('ASC'), edge('DESC')

        cur.execute(
            f"""SELECT target, COUNT(*) AS clicks FROM page_views
                WHERE event_type = 'click' AND {since} GROUP BY target ORDER BY clicks DESC LIMIT 15;""", (days,))
        clicks = cur.fetchall()

        cur.execute(
            f"""SELECT from_path, path, COUNT(*) AS views FROM page_views
                WHERE event_type = 'pageview' AND from_path IS NOT NULL AND from_path <> path AND {since}
                GROUP BY from_path, path ORDER BY views DESC LIMIT 10;""", (days,))
        flows = cur.fetchall()

        sessions = totals['sessions'] or 0
        return jsonify({
            'days': days,
            'views': totals['views'],
            'sessions': sessions,
            'avg_pages_per_session': round(_f(per_session['avg_pages']), 2) if per_session['avg_pages'] is not None else None,
            'single_page_share': round(per_session['single'] / sessions, 3) if sessions else None,
            'campus_share': round(totals['campus'] / totals['campus_known'], 3) if totals['campus_known'] else None,
            'daily': daily,
            'top_pages': top_pages,
            'entry_pages': entry_pages,
            'exit_pages': exit_pages,
            'clicks': clicks,
            'flows': flows,
        }), 200
    except Exception as e:
        print(f"analytics summary error: {type(e).__name__}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        cur.close()
        release_db_connection(conn)
