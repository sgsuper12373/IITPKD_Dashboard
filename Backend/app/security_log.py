"""Security audit log: best-effort event recording, request hooks, alerts, retention.

Everything here is best-effort and must NEVER break or slow a request beyond a
single INSERT: every public function swallows its own errors. The log is
identifiable by design (raw IP, attempted email) and therefore admin-only and
short-lived — see Database_Schema/migrations/add_security_and_analytics.sql.
Anonymous visitor analytics live separately in analytics.py.
"""
import os
import re
import threading
import time
from urllib.parse import unquote

from flask import request

from .db import get_db_connection, release_db_connection

SEVERITIES = ('info', 'warning', 'high')

# Per (ip, event_type) cap so a flood of 401s/429s can't flood the table too.
_THROTTLE_MAX_PER_MINUTE = 30
_throttle = {}
_throttle_lock = threading.Lock()

# One alert email per event type per window, per worker process.
_ALERT_WINDOW_SECONDS = 15 * 60
_last_alert = {}

_PURGE_INTERVAL_SECONDS = 24 * 60 * 60
_last_purge = 0.0
_purge_lock = threading.Lock()

_CONTROL_CHARS = re.compile(r'[\x00-\x1f\x7f]')

# Probing patterns. Detection only — the request is never blocked here; a
# normal 404/400 still happens. This exists so a scan shows up in the log.
_SUSPICIOUS = re.compile(
    r"(\.\./|\.\.\\|%2e%2e|/\.env|/\.git|wp-admin|wp-login|phpmyadmin|xmlrpc\.php|/etc/passwd|"
    r"union\s+select|or\s+1\s*=\s*1|sleep\s*\(|<script|javascript:|\$\{jndi)",
    re.IGNORECASE,
)

# Successful state-changing calls that are logged generically as 'admin_write'.
# create-user / user update log their own richer events in auth.py.
_WRITE_SKIP_PREFIXES = (
    '/api/analytics', '/api/feedback', '/auth/login', '/auth/google', '/auth/guest',
    '/auth/create-user', '/auth/users/',
)


def _clean(value, limit):
    if value is None:
        return None
    return _CONTROL_CHARS.sub(' ', str(value))[:limit]


def _client_ip():
    # request.remote_addr reflects the real client only when TRUST_PROXY_HOPS is
    # set correctly (see create_app); never read X-Forwarded-For directly here.
    return _clean(request.remote_addr, 64)


def _throttled(ip, event_type):
    now = time.time()
    key = (ip, event_type)
    with _throttle_lock:
        if len(_throttle) > 5000:
            for k in [k for k, (start, _) in _throttle.items() if now - start > 60]:
                del _throttle[k]
        start, count = _throttle.get(key, (now, 0))
        if now - start > 60:
            start, count = now, 0
        count += 1
        _throttle[key] = (start, count)
        return count > _THROTTLE_MAX_PER_MINUTE


def log_event(event_type, severity='info', *, user_id=None, email=None, detail=None, status_code=None):
    """Records one security event. Never raises. Must be called inside a request."""
    conn = None
    try:
        if severity not in SEVERITIES:
            severity = 'info'
        ip = _client_ip()
        if _throttled(ip, event_type):
            return
        conn = get_db_connection()
        if not conn:
            return
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO security_events
                (event_type, severity, ip_address, user_agent, method, endpoint, status_code, user_id, email, detail)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            """,
            (
                _clean(event_type, 60), severity, ip,
                _clean(request.headers.get('User-Agent'), 300),
                _clean(request.method, 10), _clean(request.path, 200),
                status_code, user_id, _clean(email, 254), _clean(detail, 500),
            ),
        )
        conn.commit()
        cur.close()
        if severity == 'high':
            _alert(event_type, ip, user_id, email, detail)
        _maybe_purge()
    except Exception as e:
        print(f"security_log: could not record '{event_type}': {type(e).__name__}")
        try:
            if conn:
                conn.rollback()
        except Exception:
            pass
    finally:
        if conn:
            release_db_connection(conn)


def seen_login_from_ip(user_id, ip):
    """(has_any_prior_login, has_login_from_this_ip) within the retention window."""
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return False, False
        cur = conn.cursor()
        cur.execute(
            """
            SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE ip_address = %s) AS same_ip
            FROM security_events WHERE user_id = %s AND event_type = 'login_success';
            """,
            (ip, user_id),
        )
        row = cur.fetchone()
        cur.close()
        return (row['total'] > 0, row['same_ip'] > 0)
    except Exception:
        return False, False
    finally:
        if conn:
            release_db_connection(conn)


def current_ip():
    return _client_ip()


# ── alerts ─────────────────────────────────────────────────────────────────

def _alert(event_type, ip, user_id, email, detail):
    to = os.environ.get('SECURITY_ALERT_EMAIL')
    if not to:
        return
    now = time.time()
    with _throttle_lock:
        if now - _last_alert.get(event_type, 0) < _ALERT_WINDOW_SECONDS:
            return
        _last_alert[event_type] = now

    subject = f"[IITPKD Dashboard] Security alert: {event_type}"
    body = (
        f"Event:   {event_type}\nIP:      {ip}\nUser id: {user_id}\nEmail:   {email}\n"
        f"Detail:  {detail}\n\nFurther alerts of this type are suppressed for 15 minutes. "
        "Review the Site Monitor page for the full log."
    )

    def _send():
        from .mailer import send_security_alert
        send_security_alert(to, subject, body)

    threading.Thread(target=_send, daemon=True).start()


# ── retention ──────────────────────────────────────────────────────────────

def _maybe_purge():
    global _last_purge
    now = time.time()
    with _purge_lock:
        if now - _last_purge < _PURGE_INTERVAL_SECONDS:
            return
        _last_purge = now
    threading.Thread(target=purge_old_rows, daemon=True).start()


def purge_old_rows():
    """Deletes rows past their retention period. Safe to call from a cron job too."""
    conn = None
    try:
        sec_days = max(7, int(os.environ.get('SECURITY_LOG_RETENTION_DAYS', '90')))
        ana_days = max(7, int(os.environ.get('ANALYTICS_RETENTION_DAYS', '180')))
        conn = get_db_connection()
        if not conn:
            return
        cur = conn.cursor()
        cur.execute("DELETE FROM security_events WHERE occurred_at < now() - make_interval(days => %s);", (sec_days,))
        cur.execute("DELETE FROM page_views WHERE viewed_at < now() - make_interval(days => %s);", (ana_days,))
        conn.commit()
        cur.close()
    except Exception as e:
        print(f"security_log: purge failed: {type(e).__name__}")
    finally:
        if conn:
            release_db_connection(conn)


# ── request hooks ──────────────────────────────────────────────────────────

def _user_id_from_bearer():
    """Best-effort user id from the Authorization header (signature checked, no DB lookup)."""
    try:
        from .auth import decode_auth_token
        parts = request.headers.get('Authorization', '').split()
        if len(parts) == 2 and parts[0].lower() == 'bearer':
            decoded = decode_auth_token(parts[1])
            if isinstance(decoded, dict):
                return decoded['user_id']
    except Exception:
        pass
    return None


def init_security_logging(app):
    @app.before_request
    def _detect_probing():
        probe = unquote(request.path) + ' ' + unquote(request.query_string.decode('utf-8', 'replace'))
        m = _SUSPICIOUS.search(probe)
        if m:
            log_event('suspicious_request', 'warning', detail=f"pattern '{m.group(0)[:40]}' in {request.method} request")

    @app.after_request
    def _record_outcome(response):
        try:
            status = response.status_code
            path = request.path
            if status == 429:
                log_event('rate_limited', 'warning', status_code=status)
            elif status == 403:
                log_event('access_denied', 'warning', user_id=_user_id_from_bearer(), status_code=status)
            elif status == 401 and path != '/auth/login':
                log_event('auth_rejected', 'info', status_code=status)
            elif request.method == 'GET' and path.startswith('/api/export') and status < 400:
                log_event('data_export', 'warning', user_id=_user_id_from_bearer(), detail='database export downloaded', status_code=status)
            elif (request.method in ('POST', 'PUT', 'PATCH', 'DELETE') and status < 400
                    and (path.startswith('/api/') or path.startswith('/auth/'))
                    and not path.startswith(_WRITE_SKIP_PREFIXES)):
                log_event('admin_write', 'info', user_id=_user_id_from_bearer(), detail=f"{request.method} {path}", status_code=status)
        except Exception as e:
            print(f"security_log: hook error: {type(e).__name__}")
        return response
