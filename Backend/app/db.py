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
