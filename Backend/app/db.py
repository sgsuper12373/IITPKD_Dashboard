"""Database connection helper with pooling."""
import os
from urllib.parse import urlparse, parse_qs

import psycopg2
import psycopg2.extras
from psycopg2 import pool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL')


def _warn_if_unencrypted_remote_db(url):
    """
    DATABASE_URL with no sslmode is fine for a same-host Postgres (the
    common local-dev case) but sends credentials and query data in the
    clear if the database is ever on a separate host. This only warns —
    it doesn't fail startup, since we don't know the deployment topology —
    but it makes a misconfigured remote connection visible in the logs
    instead of silently unencrypted.
    """
    if not url:
        return
    try:
        parsed = urlparse(url)
        host = (parsed.hostname or '').lower()
        has_sslmode = 'sslmode' in parse_qs(parsed.query)
    except Exception:
        return
    if host not in ('', 'localhost', '127.0.0.1', '::1') and not has_sslmode:
        print(
            f"⚠️  WARNING: DATABASE_URL points to a non-local host ('{host}') "
            "with no sslmode set — the connection, including the password, "
            "travels unencrypted. Add '?sslmode=require' (or stronger) to "
            "DATABASE_URL for any non-local database."
        )


_warn_if_unencrypted_remote_db(DATABASE_URL)

# Initialize connection pool
# minconn=1, maxconn=20 (can be adjusted based on load)
try:
    db_pool = pool.ThreadedConnectionPool(1, 20, DATABASE_URL)
    print("Database connection pool initialized successfully.")
except Exception as e:
    print(f"Error initializing database pool: {type(e).__name__}")
    db_pool = None

def get_db_connection():
    """
    Gets a connection from the pool.
    Returns a RealDictCursor-backed connection, or None if the pool fails.
    """
    if not db_pool:
        print("Database pool not available.")
        return None
    try:
        conn = db_pool.getconn()
        # Ensure we always get a RealDictCursor
        conn.cursor_factory = psycopg2.extras.RealDictCursor
        return conn
    except Exception as e:
        print(f"Error getting connection from pool: {e}")
        return None

def release_db_connection(conn):
    """
    Returns a connection to the pool.
    """
    if db_pool and conn:
        try:
            db_pool.putconn(conn)
        except Exception as e:
            print(f"Error releasing connection to pool: {e}")


# ---------------------------------------------------------------------------
# Least-privilege read pools for the public dashboard stats endpoints
# (administrative_stats.py / academic_stats.py).
#
# READONLY_DATABASE_URL authenticates as a Postgres role with SELECT granted
# only on employees_dashboard_view / students_dashboard_view — no grant on
# the base employees / student_table tables at all. READONLY_ADMIN_DATABASE_URL
# authenticates as a second role scoped to employees_admin_view /
# students_admin_view (adds appointed_category / original_category /
# pwd_status), used only once a request's JWT has been verified as
# role_id=3 (see auth._is_management). See setup_dashboard_roles.py and
# Database_Schema/migrations/add_dashboard_views.sql.
#
# Both variables are optional: if unset, get_dashboard_connection() falls
# back to the main pool (i.e. the full-privilege base-table connection) so
# an environment that hasn't run the role/view setup yet keeps working
# exactly as before, rather than failing to start.
# ---------------------------------------------------------------------------

READONLY_DATABASE_URL = os.environ.get('READONLY_DATABASE_URL')
READONLY_ADMIN_DATABASE_URL = os.environ.get('READONLY_ADMIN_DATABASE_URL')

_warn_if_unencrypted_remote_db(READONLY_DATABASE_URL)
_warn_if_unencrypted_remote_db(READONLY_ADMIN_DATABASE_URL)


def _make_pool(url, label):
    if not url:
        return None
    try:
        p = pool.ThreadedConnectionPool(1, 10, url)
        print(f"{label} connection pool initialized successfully.")
        return p
    except Exception as e:
        print(f"Error initializing {label} pool: {type(e).__name__}")
        return None


readonly_pool = _make_pool(READONLY_DATABASE_URL, "Read-only")
readonly_admin_pool = _make_pool(READONLY_ADMIN_DATABASE_URL, "Read-only admin")


def _get_pooled(target_pool):
    if not target_pool:
        return get_db_connection()   # fallback: role/view setup not configured yet
    try:
        conn = target_pool.getconn()
        conn.cursor_factory = psycopg2.extras.RealDictCursor
        return conn
    except Exception as e:
        print(f"Error getting connection from pool: {e}")
        return None


def get_dashboard_connection(is_management):
    """
    Single entry point for public-dashboard stats blueprints.

    is_management must already be a verified fact — the caller's JWT
    user_id looked up fresh against the users table (auth._is_management)
    — never a client-supplied flag. Picking the wrong pool here only ever
    narrows what's visible (worst case: a management user transiently sees
    the public view if READONLY_ADMIN_DATABASE_URL is misconfigured); it
    can never widen it, since the admin pool's own role grants are what
    actually gate access to the extra columns, not this function.
    """
    return _get_pooled(readonly_admin_pool if is_management else readonly_pool)


def release_dashboard_connection(conn, is_management):
    target_pool = readonly_admin_pool if is_management else readonly_pool
    if target_pool and conn:
        try:
            target_pool.putconn(conn)
        except Exception as e:
            print(f"Error releasing connection to pool: {e}")
    else:
        release_db_connection(conn)
