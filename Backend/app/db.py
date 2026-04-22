"""Database connection helper with pooling."""
import os
import psycopg2
import psycopg2.extras
from psycopg2 import pool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL')

# Initialize connection pool
# minconn=1, maxconn=20 (can be adjusted based on load)
try:
    db_pool = pool.ThreadedConnectionPool(1, 20, DATABASE_URL)
    print("Database connection pool initialized successfully.")
except Exception as e:
    print(f"Error initializing database pool: {e}")
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
