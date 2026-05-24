"""Endpoints for querying last_updated timestamps across all data tables."""
from flask import Blueprint, jsonify

from .auth import token_optional
from .db import get_db_connection, release_db_connection

last_updated_bp = Blueprint('last_updated', __name__)

# Hardcoded whitelist — user input is NEVER interpolated into SQL.
# Table names are only used after a whitelist membership check.
TABLES = frozenset({
    'alumni',
    'courses_table',
    'department',
    'employees',
    'ewd_yearwise',
    'externship_info',
    'faculty_engagement',
    'iar_mous',
    'icc_yearwise',
    'icsr_consultancy_projects',
    'icsr_csr',
    'icsr_sponsered_projects',
    'igrs_yearwise',
    'industry_conclave',
    'industry_events',
    'innovation_projects',
    'iptif_facilities_table',
    'iptif_program_table',
    'iptif_projects_table',
    'iptif_startup_table',
    'mou_partner_logos',
    'nirf_ranking',
    'nptel_courses',
    'open_house',
    'outreach',
    'placement_companies',
    'placement_packages',
    'placement_summary',
    'research_mous',
    'research_patents',
    'research_publications',
    'roles',
    'student_table',
    'techin_program_table',
    'techin_skill_development_program',
    'techin_startup_table',
    'uba_events',
    'uba_projects',
    'users',
})

# Pre-built UNION ALL query — constructed once at import time from the whitelist,
# so no user input ever reaches string interpolation at request time.
_UNION_ALL_SQL = ' UNION ALL '.join(
    f"SELECT '{t}' AS table_name, MAX(last_updated) AS last_updated FROM public.{t}"
    for t in sorted(TABLES)
)


def _iso(ts):
    """Return ISO 8601 string or None for a psycopg2 datetime value."""
    if ts is None:
        return None
    return ts.isoformat()


# ── GET /api/last-updated  ────────────────────────────────────────────────────

@last_updated_bp.route('/', methods=['GET'])
@token_optional
def get_all(current_user_id=None):
    """Return last_updated for ALL whitelisted tables in a single DB round trip."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        cur = conn.cursor()
        cur.execute(_UNION_ALL_SQL)
        rows = cur.fetchall()
        cur.close()
        result = {row['table_name']: _iso(row['last_updated']) for row in rows}
        return jsonify({'tables': result}), 200
    except Exception as exc:
        conn.rollback()
        return jsonify({'error': str(exc)}), 500
    finally:
        release_db_connection(conn)


# ── GET /api/last-updated/<table>  ───────────────────────────────────────────

@last_updated_bp.route('/<string:table_name>', methods=['GET'])
@token_optional
def get_one(current_user_id=None, table_name=None):
    """Return last_updated for a single whitelisted table."""
    if table_name not in TABLES:
        return jsonify({'error': f"Unknown table '{table_name}'."}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        cur = conn.cursor()
        # Safe: table_name is confirmed to be in TABLES (hardcoded whitelist above)
        cur.execute(
            f"SELECT MAX(last_updated) AS last_updated FROM public.{table_name}"  # noqa: S608
        )
        row = cur.fetchone()
        cur.close()
        return jsonify({
            'table': table_name,
            'last_updated': _iso(row['last_updated']) if row else None,
        }), 200
    except Exception as exc:
        conn.rollback()
        return jsonify({'error': str(exc)}), 500
    finally:
        release_db_connection(conn)
