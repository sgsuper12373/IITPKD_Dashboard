"""
Blueprint providing analytics for the Innovation and Entrepreneurship module:
- TECHIN (Technology Innovation Foundation of IIT Palakkad)
- IPTIF (IIT Palakkad Technology IHub Foundation)
- Incubatees, Startups, and Innovation Projects
"""
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

from flask import Blueprint, jsonify, request
from psycopg2 import extras

from .auth import token_optional
from .db import get_db_connection, release_db_connection


innovation_bp = Blueprint('innovation', __name__)

STARTUPS_TABLE = 'startups'
INNOVATION_PROJECTS_TABLE = 'innovation_projects'

# IPTIF Tables
IPTIF_FACILITIES_TABLE = 'iptif_facilities_table'
IPTIF_PROGRAM_TABLE = 'iptif_program_table'
IPTIF_PROJECTS_TABLE = 'iptif_projects_table'
IPTIF_STARTUP_TABLE = 'iptif_startup_table'

# TechIn Tables
TECHIN_PROGRAM_TABLE = 'techin_program_table'
TECHIN_SKILL_DEV_TABLE = 'techin_skill_development_program'
TECHIN_STARTUP_TABLE = 'techin_startup_table'


def _table_exists(conn, table_name: str) -> bool:
    """Check if a table exists in the database."""
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND LOWER(table_name) = LOWER(%s)
            )
            """,
            (table_name,),
        )
        result = cur.fetchone()
        if isinstance(result, dict):
            return bool(result.get('exists', False))
        return bool(result[0] if result else False)
    except Exception:
        return False
    finally:
        cur.close()


def _data_available() -> bool:
    """Check if innovation tables exist."""
    conn = get_db_connection()
    if not conn:
        return False
    try:
        return (
            _table_exists(conn, STARTUPS_TABLE) and 
            _table_exists(conn, INNOVATION_PROJECTS_TABLE)
        )
    finally:
        release_db_connection(conn)


def _iptif_data_available() -> bool:
    """Check if IPTIF tables exist."""
    conn = get_db_connection()
    if not conn:
        return False
    try:
        return (
            _table_exists(conn, IPTIF_PROJECTS_TABLE) and 
            _table_exists(conn, IPTIF_PROGRAM_TABLE) and 
            _table_exists(conn, IPTIF_STARTUP_TABLE) and 
            _table_exists(conn, IPTIF_FACILITIES_TABLE)
        )
    finally:
        release_db_connection(conn)


def _techin_data_available() -> bool:
    """Check if TechIn tables exist."""
    conn = get_db_connection()
    if not conn:
        return False
    try:
        return (
            _table_exists(conn, TECHIN_PROGRAM_TABLE) and 
            _table_exists(conn, TECHIN_SKILL_DEV_TABLE) and 
            _table_exists(conn, TECHIN_STARTUP_TABLE)
        )
    finally:
        release_db_connection(conn)


def build_where_clause(filter_mapping: Dict[str, str], filters: Dict[str, Any]) -> Tuple[str, List]:
    """Build WHERE clause from filters."""
    conditions = []
    params = []
    
    for filter_key, db_column in filter_mapping.items():
        value = filters.get(filter_key)
        if value is not None and value != '' and value != 'All':
            conditions.append(f"{db_column} = %s")
            params.append(value)
    
    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
    return where_clause, params


@innovation_bp.route('/summary', methods=['GET'])
@token_optional
def get_summary(current_user_id):
    """Get summary statistics for innovation and entrepreneurship."""
    if not _data_available():
        return jsonify({'message': 'Innovation tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        # Total incubatees (all startups)
        cur.execute(f"SELECT COUNT(*) as total FROM {STARTUPS_TABLE};")
        total_incubatees = cur.fetchone()['total'] or 0
        
        # Total startups (same as incubatees, but for clarity)
        total_startups = total_incubatees
        
        # Total innovation projects
        cur.execute(f"SELECT COUNT(*) as total FROM {INNOVATION_PROJECTS_TABLE};")
        total_innovation_projects = cur.fetchone()['total'] or 0
        
        # Startups from IIT Palakkad
        cur.execute(
            f"SELECT COUNT(*) as total FROM {STARTUPS_TABLE} WHERE is_from_iitpkd = TRUE;"
        )
        startups_from_iitpkd = cur.fetchone()['total'] or 0
        
        return jsonify({
            'total_incubatees': total_incubatees,
            'total_startups': total_startups,
            'total_innovation_projects': total_innovation_projects,
            'startups_from_iitpkd': startups_from_iitpkd
        }), 200
        
    except Exception as e:
        print(f"Innovation summary error: {e}")
        return jsonify({'message': 'Failed to fetch summary statistics.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@innovation_bp.route('/yearly-growth', methods=['GET'])
@token_optional
def get_yearly_growth(current_user_id):
    """Get year-wise growth of incubatees and startups."""
    if not _data_available():
        return jsonify({'message': 'Innovation tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        # Get year-wise counts for startups/incubatees
        cur.execute(f"""
            SELECT 
                year_of_incubation as year,
                COUNT(*) as incubatees,
                COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_startups,
                COUNT(CASE WHEN is_from_iitpkd = TRUE THEN 1 END) as iitpkd_startups
            FROM {STARTUPS_TABLE}
            GROUP BY year_of_incubation
            ORDER BY year_of_incubation ASC;
        """)
        startup_data = cur.fetchall()
        
        # Get year-wise counts for innovation projects
        cur.execute(f"""
            SELECT 
                year_started as year,
                COUNT(*) as projects
            FROM {INNOVATION_PROJECTS_TABLE}
            GROUP BY year_started
            ORDER BY year_started ASC;
        """)
        project_data = cur.fetchall()
        
        # Combine data by year
        year_data = {}
        for row in startup_data:
            year = row['year']
            year_data[year] = {
                'year': year,
                'incubatees': row['incubatees'] or 0,
                'startups': row['incubatees'] or 0,  # Same as incubatees
                'active_startups': row['active_startups'] or 0,
                'iitpkd_startups': row['iitpkd_startups'] or 0,
                'innovation_projects': 0
            }
        
        for row in project_data:
            year = row['year']
            if year in year_data:
                year_data[year]['innovation_projects'] = row['projects'] or 0
            else:
                year_data[year] = {
                    'year': year,
                    'incubatees': 0,
                    'startups': 0,
                    'active_startups': 0,
                    'iitpkd_startups': 0,
                    'innovation_projects': row['projects'] or 0
                }
        
        # Convert to list and sort
        result = sorted(year_data.values(), key=lambda x: x['year'])
        
        return jsonify({'data': result}), 200
        
    except Exception as e:
        print(f"Innovation yearly growth error: {e}")
        return jsonify({'message': 'Failed to fetch yearly growth data.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@innovation_bp.route('/sector-distribution', methods=['GET'])
@token_optional
def get_sector_distribution(current_user_id):
    """Get sector-wise innovation distribution."""
    if not _data_available():
        return jsonify({'message': 'Innovation tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        # Get sector distribution from startups
        cur.execute(f"""
            SELECT 
                COALESCE(sector, 'Unspecified') as sector,
                COUNT(*) as startups,
                COUNT(CASE WHEN is_from_iitpkd = TRUE THEN 1 END) as iitpkd_startups
            FROM {STARTUPS_TABLE}
            GROUP BY sector
            ORDER BY startups DESC;
        """)
        startup_sectors = cur.fetchall()
        
        # Get sector distribution from innovation projects
        cur.execute(f"""
            SELECT 
                COALESCE(sector, 'Unspecified') as sector,
                COUNT(*) as projects
            FROM {INNOVATION_PROJECTS_TABLE}
            GROUP BY sector
            ORDER BY projects DESC;
        """)
        project_sectors = cur.fetchall()
        
        # Combine sectors
        sector_data = {}
        for row in startup_sectors:
            sector = row['sector']
            sector_data[sector] = {
                'sector': sector,
                'startups': row['startups'] or 0,
                'iitpkd_startups': row['iitpkd_startups'] or 0,
                'projects': 0
            }
        
        for row in project_sectors:
            sector = row['sector']
            if sector in sector_data:
                sector_data[sector]['projects'] = row['projects'] or 0
            else:
                sector_data[sector] = {
                    'sector': sector,
                    'startups': 0,
                    'iitpkd_startups': 0,
                    'projects': row['projects'] or 0
                }
        
        result = list(sector_data.values())
        
        return jsonify({'data': result}), 200
        
    except Exception as e:
        print(f"Innovation sector distribution error: {e}")
        return jsonify({'message': 'Failed to fetch sector distribution.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@innovation_bp.route('/startups', methods=['GET'])
@token_optional
def get_startups(current_user_id):
    """Get list of startups with search and filter capabilities."""
    if not _data_available():
        return jsonify({'message': 'Innovation tables are missing.'}), 500

    filters = {
        'status': request.args.get('status'),
        'sector': request.args.get('sector'),
        'year': request.args.get('year'),
        'iitpkd_only': request.args.get('iitpkd_only', 'false').lower() == 'true',
        'search': request.args.get('search', '').strip()
    }
    
    # Pagination
    page = request.args.get('page', default=1, type=int)
    per_page = request.args.get('per_page', default=50, type=int)
    per_page = max(1, min(per_page, 100))
    offset = (page - 1) * per_page

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        # Build WHERE clause
        conditions = []
        params = []
        
        if filters['status'] and filters['status'] != 'All':
            conditions.append("status = %s")
            params.append(filters['status'])
        
        if filters['sector'] and filters['sector'] != 'All':
            conditions.append("sector = %s")
            params.append(filters['sector'])
        
        if filters['year']:
            conditions.append("year_of_incubation = %s")
            params.append(int(filters['year']))
        
        if filters['iitpkd_only']:
            conditions.append("is_from_iitpkd = TRUE")
        
        if filters['search']:
            conditions.append(
                "(startup_name ILIKE %s OR founder_name ILIKE %s OR innovation_focus_area ILIKE %s)"
            )
            search_pattern = f"%{filters['search']}%"
            params.extend([search_pattern, search_pattern, search_pattern])
        
        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM {STARTUPS_TABLE} {where_clause};"
        cur.execute(count_query, params)
        total = cur.fetchone()['total'] or 0
        
        # Get startups
        query = f"""
            SELECT 
                startup_id,
                startup_name,
                founder_name,
                innovation_focus_area,
                year_of_incubation,
                status,
                sector,
                is_from_iitpkd
            FROM {STARTUPS_TABLE}
            {where_clause}
            ORDER BY year_of_incubation DESC, startup_name ASC
            LIMIT %s OFFSET %s;
        """
        cur.execute(query, params + [per_page, offset])
        startups = cur.fetchall()
        
        result = []
        for row in startups:
            result.append({
                'startup_id': row['startup_id'],
                'startup_name': row['startup_name'],
                'founder_name': row['founder_name'],
                'innovation_focus_area': row['innovation_focus_area'],
                'year_of_incubation': row['year_of_incubation'],
                'status': row['status'],
                'sector': row['sector'],
                'is_from_iitpkd': bool(row['is_from_iitpkd'])
            })
        
        return jsonify({
            'data': result,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': (total + per_page - 1) // per_page
            }
        }), 200
        
    except Exception as e:
        print(f"Innovation startups list error: {e}")
        return jsonify({'message': 'Failed to fetch startups list.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@innovation_bp.route('/filter-options', methods=['GET'])
@token_optional
def get_filter_options(current_user_id):
    """Get filter options for startups and projects with cross-filtering."""
    if not _data_available():
        return jsonify({'message': 'Innovation tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500

        # Active filters
        active_status = request.args.get('status')
        active_sector = request.args.get('sector')
        active_year   = request.args.get('year')
        def clean(v): return None if (v is None or v in ('', 'All')) else v
        active_status = clean(active_status)
        active_sector = clean(active_sector)
        active_year   = clean(active_year)

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        # Statuses: filter by sector + year (exclude status itself)
        conds, params = [], []
        if active_sector: conds.append("sector = %s"); params.append(active_sector)
        if active_year:   conds.append("year_of_incubation = %s"); params.append(int(active_year))
        w = ("WHERE " + " AND ".join(conds) + " AND ") if conds else "WHERE "
        cur.execute(f"SELECT DISTINCT status FROM {STARTUPS_TABLE} {w}status IS NOT NULL ORDER BY status;", params)
        statuses = [row['status'] for row in cur.fetchall() if row['status']]

        # Sectors: filter by status + year
        conds, params = [], []
        if active_status: conds.append("status = %s"); params.append(active_status)
        if active_year:   conds.append("year_of_incubation = %s"); params.append(int(active_year))
        w = ("WHERE " + " AND ".join(conds) + " AND ") if conds else "WHERE "
        cur.execute(f"SELECT DISTINCT sector FROM {STARTUPS_TABLE} {w}sector IS NOT NULL AND sector != '' ORDER BY sector;", params)
        sectors = [row['sector'] for row in cur.fetchall() if row['sector']]

        # Years: filter by status + sector
        conds, params = [], []
        if active_status: conds.append("status = %s"); params.append(active_status)
        if active_sector: conds.append("sector = %s"); params.append(active_sector)
        w = ("WHERE " + " AND ".join(conds) + " AND ") if conds else "WHERE "
        cur.execute(f"SELECT DISTINCT year_of_incubation as year FROM {STARTUPS_TABLE} {w}year_of_incubation IS NOT NULL ORDER BY year DESC;", params)
        years = [row['year'] for row in cur.fetchall() if row['year']]

        return jsonify({
            'statuses': statuses,
            'sectors': sectors,
            'years': years
        }), 200

    except Exception as e:
        print(f"Innovation filter options error: {e}")
        return jsonify({'message': 'Failed to fetch filter options.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


# ==========================================
#               IPTIF ENDPOINTS
# ==========================================

@innovation_bp.route('/iptif/summary', methods=['GET'])
@token_optional
def get_iptif_summary(current_user_id):
    """Get overall summary for IPTIF."""
    if not _iptif_data_available():
        return jsonify({'message': 'IPTIF tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        cur.execute(f"SELECT COUNT(*) as total FROM {IPTIF_PROJECTS_TABLE};")
        total_projects = cur.fetchone()['total'] or 0
        
        cur.execute(f"SELECT COUNT(*) as total FROM {IPTIF_PROGRAM_TABLE};")
        total_programs = cur.fetchone()['total'] or 0
        
        cur.execute(f"SELECT COUNT(*) as total FROM {IPTIF_STARTUP_TABLE};")
        total_startups = cur.fetchone()['total'] or 0
        
        return jsonify({
            'total_projects': total_projects,
            'total_programs': total_programs,
            'total_startups': total_startups
        }), 200
        
    except Exception as e:
        print(f"IPTIF summary error: {e}")
        return jsonify({'message': 'Failed to fetch IPTIF summary statistics.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@innovation_bp.route('/iptif/trends/projects', methods=['GET'])
@token_optional
def get_iptif_projects(current_user_id):
    """Get IPTIF projects trend and list."""
    if not _iptif_data_available():
        return jsonify({'message': 'IPTIF tables are missing.'}), 500

    filters = {
        'scheme': request.args.get('scheme'),
        'status': request.args.get('status'),
        'year': request.args.get('year')
    }

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        conditions = []
        params = []
        if filters['scheme'] and filters['scheme'] != 'All':
            conditions.append("scheme = %s")
            params.append(filters['scheme'])
        if filters['status'] and filters['status'] != 'All':
            conditions.append("status = %s")
            params.append(filters['status'])
        if filters['year'] and filters['year'] != 'All':
            conditions.append("EXTRACT(YEAR FROM start_date)::INT = %s")
            params.append(int(filters['year']))
        
        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        
        # Trend Data
        trend_query = f"""
            SELECT EXTRACT(YEAR FROM start_date)::INT as year, COUNT(*) as count
            FROM {IPTIF_PROJECTS_TABLE}
            {where_clause}
            GROUP BY year
            ORDER BY year ASC;
        """
        cur.execute(trend_query, params)
        trend = [dict(row) for row in cur.fetchall() if row['year']]
        
        # List Data
        list_query = f"""
            SELECT * FROM {IPTIF_PROJECTS_TABLE}
            {where_clause}
            ORDER BY start_date DESC;
        """
        cur.execute(list_query, params)
        data_list = [dict(row) for row in cur.fetchall()]
        
        return jsonify({'trend': trend, 'data': data_list}), 200
        
    except Exception as e:
        print(f"IPTIF projects error: {e}")
        return jsonify({'message': 'Failed to fetch IPTIF projects data.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@innovation_bp.route('/iptif/trends/programs', methods=['GET'])
@token_optional
def get_iptif_programs(current_user_id):
    """Get IPTIF programs trend and list."""
    if not _iptif_data_available():
        return jsonify({'message': 'IPTIF tables are missing.'}), 500

    filters = {
        'type': request.args.get('type'),
        'association': request.args.get('association')
    }

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        conditions = []
        params = []
        if filters['type'] and filters['type'] != 'All':
            conditions.append("type = %s")
            params.append(filters['type'])
        if filters['association'] and filters['association'] != 'All':
            conditions.append("association = %s")
            params.append(filters['association'])
        
        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        
        trend_query = f"""
            SELECT EXTRACT(YEAR FROM COALESCE(start_end, date))::INT as year, COUNT(*) as count
            FROM {IPTIF_PROGRAM_TABLE}
            {where_clause}
            GROUP BY year
            ORDER BY year ASC;
        """
        cur.execute(trend_query, params)
        trend = [dict(row) for row in cur.fetchall() if row['year']]
        
        list_query = f"""
            SELECT * FROM {IPTIF_PROGRAM_TABLE}
            {where_clause}
            ORDER BY COALESCE(start_end, date) DESC;
        """
        cur.execute(list_query, params)
        data_list = [dict(row) for row in cur.fetchall()]
        
        return jsonify({'trend': trend, 'data': data_list}), 200
        
    except Exception as e:
        print(f"IPTIF programs error: {e}")
        return jsonify({'message': 'Failed to fetch IPTIF programs data.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@innovation_bp.route('/iptif/trends/startups', methods=['GET'])
@token_optional
def get_iptif_startups(current_user_id):
    """Get IPTIF startups trend and list."""
    if not _iptif_data_available():
        return jsonify({'message': 'IPTIF tables are missing.'}), 500

    filters = {
        'domain': request.args.get('domain'),
        'status': request.args.get('status')
    }

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        conditions = []
        params = []
        if filters['domain'] and filters['domain'] != 'All':
            conditions.append("domain = %s")
            params.append(filters['domain'])
        if filters['status'] and filters['status'] != 'All':
            conditions.append("status = %s")
            params.append(filters['status'])
        
        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        
        trend_query = f"""
            SELECT EXTRACT(YEAR FROM incubated_date)::INT as year, COUNT(*) as count
            FROM {IPTIF_STARTUP_TABLE}
            {where_clause}
            GROUP BY year
            ORDER BY year ASC;
        """
        cur.execute(trend_query, params)
        trend = [dict(row) for row in cur.fetchall() if row['year']]
        
        list_query = f"""
            SELECT * FROM {IPTIF_STARTUP_TABLE}
            {where_clause}
            ORDER BY incubated_date DESC;
        """
        cur.execute(list_query, params)
        data_list = [dict(row) for row in cur.fetchall()]
        
        return jsonify({'trend': trend, 'data': data_list}), 200
        
    except Exception as e:
        print(f"IPTIF startups error: {e}")
        return jsonify({'message': 'Failed to fetch IPTIF startups data.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@innovation_bp.route('/iptif/trends/facilities', methods=['GET'])
@token_optional
def get_iptif_facilities_revenue(current_user_id):
    """Get IPTIF facilities revenue trend and list."""
    if not _iptif_data_available():
        return jsonify({'message': 'IPTIF tables are missing.'}), 500

    filters = {
        'facility_type': request.args.get('facility_type')
    }

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        conditions = []
        params = []
        if filters['facility_type'] and filters['facility_type'] != 'All':
            conditions.append("facility_type = %s")
            params.append(filters['facility_type'])
        
        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        
        trend_query = f"""
            SELECT financial_year as year, SUM(revenue_made) as count
            FROM {IPTIF_FACILITIES_TABLE}
            {where_clause}
            GROUP BY financial_year
            ORDER BY financial_year ASC;
        """
        cur.execute(trend_query, params)
        trend = [dict(row) for row in cur.fetchall() if row['year'] is not None]
        
        list_query = f"""
            SELECT * FROM {IPTIF_FACILITIES_TABLE}
            {where_clause}
            ORDER BY financial_year DESC, facility_name ASC;
        """
        cur.execute(list_query, params)
        data_list = [dict(row) for row in cur.fetchall()]
        
        return jsonify({'trend': trend, 'data': data_list}), 200
        
    except Exception as e:
        print(f"IPTIF facilities error: {e}")
        return jsonify({'message': 'Failed to fetch IPTIF facilities data.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@innovation_bp.route('/iptif/filter-options', methods=['GET'])
@token_optional
def get_iptif_filter_options(current_user_id):
    """Get filter options for all IPTIF tables."""
    if not _iptif_data_available():
        return jsonify({'message': 'IPTIF tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        # Projects options
        cur.execute(f"SELECT DISTINCT scheme FROM {IPTIF_PROJECTS_TABLE} WHERE scheme IS NOT NULL ORDER BY scheme;")
        project_schemes = [row['scheme'] for row in cur.fetchall()]
        cur.execute(f"SELECT DISTINCT status FROM {IPTIF_PROJECTS_TABLE} WHERE status IS NOT NULL ORDER BY status;")
        project_statuses = [row['status'] for row in cur.fetchall()]
        cur.execute(f"SELECT DISTINCT EXTRACT(YEAR FROM start_date)::INT as year FROM {IPTIF_PROJECTS_TABLE} WHERE start_date IS NOT NULL ORDER BY year DESC;")
        project_years = [row['year'] for row in cur.fetchall()]

        # Programs options
        cur.execute(f"SELECT DISTINCT type FROM {IPTIF_PROGRAM_TABLE} WHERE type IS NOT NULL ORDER BY type;")
        program_types = [row['type'] for row in cur.fetchall()]
        cur.execute(f"SELECT DISTINCT association FROM {IPTIF_PROGRAM_TABLE} WHERE association IS NOT NULL ORDER BY association;")
        program_associations = [row['association'] for row in cur.fetchall()]

        # Startups options
        cur.execute(f"SELECT DISTINCT domain FROM {IPTIF_STARTUP_TABLE} WHERE domain IS NOT NULL ORDER BY domain;")
        startup_domains = [row['domain'] for row in cur.fetchall()]
        cur.execute(f"SELECT DISTINCT status FROM {IPTIF_STARTUP_TABLE} WHERE status IS NOT NULL ORDER BY status;")
        startup_statuses = [row['status'] for row in cur.fetchall()]

        # Facilities options
        cur.execute(f"SELECT DISTINCT facility_type FROM {IPTIF_FACILITIES_TABLE} WHERE facility_type IS NOT NULL ORDER BY facility_type;")
        facility_types = [row['facility_type'] for row in cur.fetchall()]
        
        return jsonify({
            'projects': {
                'schemes': project_schemes,
                'statuses': project_statuses,
                'years': project_years
            },
            'programs': {
                'types': program_types,
                'associations': program_associations
            },
            'startups': {
                'domains': startup_domains,
                'statuses': startup_statuses
            },
            'facilities': {
                'types': facility_types
            }
        }), 200
        
    except Exception as e:
        print(f"IPTIF filter options error: {e}")
        return jsonify({'message': 'Failed to fetch filter options.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


# ==========================================
#               TECHIN ENDPOINTS
# ==========================================

@innovation_bp.route('/techin/summary', methods=['GET'])
@token_optional
def get_techin_summary(current_user_id):
    """Get overall summary for TechIn."""
    if not _techin_data_available():
        return jsonify({'message': 'TechIn tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        cur.execute(f"SELECT COUNT(*) as total FROM {TECHIN_PROGRAM_TABLE};")
        total_programs = cur.fetchone()['total'] or 0
        
        cur.execute(f"SELECT COUNT(*) as total FROM {TECHIN_SKILL_DEV_TABLE};")
        total_skill_dev_programs = cur.fetchone()['total'] or 0
        
        cur.execute(f"SELECT COUNT(*) as total FROM {TECHIN_STARTUP_TABLE};")
        total_startups = cur.fetchone()['total'] or 0

        # Revenue statistics from the techin_startup_table
        cur.execute(f"""
            SELECT 
                COALESCE(SUM(revenue), 0) as total_revenue,
                COALESCE(MAX(revenue), 0) as max_revenue,
                COALESCE(MIN(revenue), 0) as min_revenue,
                COALESCE(AVG(revenue), 0) as avg_revenue
            FROM {TECHIN_STARTUP_TABLE} 
            WHERE revenue IS NOT NULL;
        """)
        rev_stats = cur.fetchone()
        
        return jsonify({
            'total_programs': total_programs,
            'total_skill_dev_programs': total_skill_dev_programs,
            'total_startups': total_startups,
            'total_startup_revenue': float(rev_stats['total_revenue']),
            'highest_revenue': float(rev_stats['max_revenue']),
            'lowest_revenue': float(rev_stats['min_revenue']),
            'average_revenue': float(rev_stats['avg_revenue'])
        }), 200
        
    except Exception as e:
        print(f"TechIn summary error: {e}")
        return jsonify({'message': 'Failed to fetch TechIn summary statistics.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@innovation_bp.route('/techin/trends/programs', methods=['GET'])
@token_optional
def get_techin_programs(current_user_id):
    """Get TechIn programs trend and list."""
    if not _techin_data_available():
        return jsonify({'message': 'TechIn tables are missing.'}), 500

    filters = {
        'type': request.args.get('type'),
        'association': request.args.get('association')
    }

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        conditions = []
        params = []
        if filters['type'] and filters['type'] != 'All':
            conditions.append("type = %s")
            params.append(filters['type'])
        if filters['association'] and filters['association'] != 'All':
            conditions.append("association = %s")
            params.append(filters['association'])
        
        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        
        trend_query = f"""
            SELECT EXTRACT(YEAR FROM COALESCE(start_end, event_date))::INT as year, COUNT(*) as count
            FROM {TECHIN_PROGRAM_TABLE}
            {where_clause}
            GROUP BY year
            ORDER BY year ASC;
        """
        cur.execute(trend_query, params)
        trend = [dict(row) for row in cur.fetchall() if row['year']]
        
        list_query = f"""
            SELECT * FROM {TECHIN_PROGRAM_TABLE}
            {where_clause}
            ORDER BY COALESCE(start_end, event_date) DESC;
        """
        cur.execute(list_query, params)
        data_list = [dict(row) for row in cur.fetchall()]
        
        return jsonify({'trend': trend, 'data': data_list}), 200
        
    except Exception as e:
        print(f"TechIn programs error: {e}")
        return jsonify({'message': 'Failed to fetch TechIn programs data.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@innovation_bp.route('/techin/trends/skill-dev', methods=['GET'])
@token_optional
def get_techin_skill_dev(current_user_id):
    """Get TechIn skill development trend and list."""
    if not _techin_data_available():
        return jsonify({'message': 'TechIn tables are missing.'}), 500

    filters = {
        'category': request.args.get('category'),
        'association': request.args.get('association')
    }

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        conditions = []
        params = []
        if filters['category'] and filters['category'] != 'All':
            conditions.append("category = %s")
            params.append(filters['category'])
        if filters['association'] and filters['association'] != 'All':
            conditions.append("association = %s")
            params.append(filters['association'])
        
        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        
        trend_query = f"""
            SELECT EXTRACT(YEAR FROM COALESCE(start_end, event_date))::INT as year, COUNT(*) as count
            FROM {TECHIN_SKILL_DEV_TABLE}
            {where_clause}
            GROUP BY year
            ORDER BY year ASC;
        """
        cur.execute(trend_query, params)
        trend = [dict(row) for row in cur.fetchall() if row['year']]
        
        list_query = f"""
            SELECT * FROM {TECHIN_SKILL_DEV_TABLE}
            {where_clause}
            ORDER BY COALESCE(start_end, event_date) DESC;
        """
        cur.execute(list_query, params)
        data_list = [dict(row) for row in cur.fetchall()]
        
        return jsonify({'trend': trend, 'data': data_list}), 200
        
    except Exception as e:
        print(f"TechIn skill-dev error: {e}")
        return jsonify({'message': 'Failed to fetch TechIn skill development data.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@innovation_bp.route('/techin/trends/startups', methods=['GET'])
@token_optional
def get_techin_startups(current_user_id):
    """Get TechIn startups trend and list."""
    if not _techin_data_available():
        return jsonify({'message': 'TechIn tables are missing.'}), 500

    filters = {
        'domain': request.args.get('domain'),
        'status': request.args.get('status')
    }

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        conditions = []
        params = []
        if filters['domain'] and filters['domain'] != 'All':
            conditions.append("domain = %s")
            params.append(filters['domain'])
        if filters['status'] and filters['status'] != 'All':
            conditions.append("status = %s")
            params.append(filters['status'])
        
        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        
        trend_query = f"""
            SELECT EXTRACT(YEAR FROM incubated_date)::INT as year, COUNT(*) as count
            FROM {TECHIN_STARTUP_TABLE}
            {where_clause}
            GROUP BY year
            ORDER BY year ASC;
        """
        cur.execute(trend_query, params)
        trend = [dict(row) for row in cur.fetchall() if row['year']]
        
        list_query = f"""
            SELECT * FROM {TECHIN_STARTUP_TABLE}
            {where_clause}
            ORDER BY incubated_date DESC;
        """
        cur.execute(list_query, params)
        data_list = [dict(row) for row in cur.fetchall()]
        
        return jsonify({'trend': trend, 'data': data_list}), 200
        
    except Exception as e:
        print(f"TechIn startups error: {e}")
        return jsonify({'message': 'Failed to fetch TechIn startups data.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@innovation_bp.route('/techin/filter-options', methods=['GET'])
@token_optional
def get_techin_filter_options(current_user_id):
    """Get filter options for TechIn tables."""
    if not _techin_data_available():
        return jsonify({'message': 'TechIn tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        # Programs
        cur.execute(f"SELECT DISTINCT type FROM {TECHIN_PROGRAM_TABLE} WHERE type IS NOT NULL ORDER BY type;")
        program_types = [row['type'] for row in cur.fetchall()]
        cur.execute(f"SELECT DISTINCT association FROM {TECHIN_PROGRAM_TABLE} WHERE association IS NOT NULL ORDER BY association;")
        program_associations = [row['association'] for row in cur.fetchall()]

        # Skill Dev Programs
        cur.execute(f"SELECT DISTINCT category FROM {TECHIN_SKILL_DEV_TABLE} WHERE category IS NOT NULL ORDER BY category;")
        skill_dev_categories = [row['category'] for row in cur.fetchall()]
        cur.execute(f"SELECT DISTINCT association FROM {TECHIN_SKILL_DEV_TABLE} WHERE association IS NOT NULL ORDER BY association;")
        skill_dev_associations = [row['association'] for row in cur.fetchall()]

        # Startups
        cur.execute(f"SELECT DISTINCT domain FROM {TECHIN_STARTUP_TABLE} WHERE domain IS NOT NULL ORDER BY domain;")
        startup_domains = [row['domain'] for row in cur.fetchall()]
        cur.execute(f"SELECT DISTINCT status FROM {TECHIN_STARTUP_TABLE} WHERE status IS NOT NULL ORDER BY status;")
        startup_statuses = [row['status'] for row in cur.fetchall()]

        return jsonify({
            'programs': {
                'types': program_types,
                'associations': program_associations
            },
            'skill_dev': {
                'categories': skill_dev_categories,
                'associations': skill_dev_associations
            },
            'startups': {
                'domains': startup_domains,
                'statuses': startup_statuses
            }
        }), 200
        
    except Exception as e:
        print(f"TechIn filter options error: {e}")
        return jsonify({'message': 'Failed to fetch filter options.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


# ==========================================
#         HOME GROUND STARTUPS ENDPOINTS
# ==========================================
# Only entries where LOWER(startup_origin) = 'internal' are considered.
# Both iptif_startup_table and techin_startup_table are queried together.

def _home_ground_available():
    conn = get_db_connection()
    if not conn:
        return False
    try:
        return _table_exists(conn, IPTIF_STARTUP_TABLE) or _table_exists(conn, TECHIN_STARTUP_TABLE)
    finally:
        release_db_connection(conn)


@innovation_bp.route('/home-ground/summary', methods=['GET'])
@token_optional
def get_home_ground_summary(current_user_id):
    """Summary stats for internal-origin startups from both IPTIF and TechIn tables."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        internal_filter = "LOWER(COALESCE(startup_origin, '')) = 'internal'"

        union_base = f"""
            SELECT revenue, number_of_jobs FROM {IPTIF_STARTUP_TABLE}
            WHERE {internal_filter}
            UNION ALL
            SELECT revenue, number_of_jobs FROM {TECHIN_STARTUP_TABLE}
            WHERE {internal_filter}
        """

        cur.execute(f"SELECT COUNT(*) as total FROM ({union_base}) AS combined;")
        total_startups = cur.fetchone()['total'] or 0

        cur.execute(f"""
            SELECT
                COALESCE(SUM(revenue), 0) as total_revenue,
                COALESCE(MAX(revenue), 0) as highest_revenue,
                COALESCE(AVG(revenue), 0) as average_revenue
            FROM ({union_base}) AS combined
            WHERE revenue IS NOT NULL;
        """)
        rev_stats = cur.fetchone()

        cur.execute(f"""
            SELECT COALESCE(SUM(number_of_jobs), 0) as total_jobs
            FROM ({union_base}) AS combined;
        """)
        jobs_row = cur.fetchone()

        return jsonify({
            'total_startups': total_startups,
            'total_revenue': float(rev_stats['total_revenue']),
            'highest_revenue': float(rev_stats['highest_revenue']),
            'average_revenue': float(rev_stats['average_revenue']),
            'total_jobs': int(jobs_row['total_jobs'])
        }), 200

    except Exception as e:
        print(f"Home ground summary error: {e}")
        return jsonify({'message': 'Failed to fetch home ground summary.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@innovation_bp.route('/home-ground/trends/startups', methods=['GET'])
@token_optional
def get_home_ground_startups(current_user_id):
    """Startup growth trend and list for internal-origin startups from both tables."""
    filters = {
        'domain': request.args.get('domain'),
        'status': request.args.get('status')
    }

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        conditions = ["LOWER(COALESCE(startup_origin, '')) = 'internal'"]
        params = []
        if filters['domain'] and filters['domain'] != 'All':
            conditions.append("domain = %s")
            params.append(filters['domain'])
        if filters['status'] and filters['status'] != 'All':
            conditions.append("status = %s")
            params.append(filters['status'])

        where_clause = "WHERE " + " AND ".join(conditions)

        union_query = f"""
            SELECT startup_name, domain, status, number_of_jobs, revenue, incubated_date
            FROM {IPTIF_STARTUP_TABLE}
            {where_clause}
            UNION ALL
            SELECT startup_name, domain, status, number_of_jobs, revenue, incubated_date
            FROM {TECHIN_STARTUP_TABLE}
            {where_clause}
        """

        trend_query = f"""
            SELECT EXTRACT(YEAR FROM incubated_date)::INT as year, COUNT(*) as count
            FROM ({union_query}) AS combined
            GROUP BY year
            ORDER BY year ASC;
        """
        cur.execute(trend_query, params + params)
        trend = [dict(row) for row in cur.fetchall() if row['year']]

        list_query = f"""
            SELECT startup_name, domain, status, number_of_jobs, revenue, incubated_date
            FROM ({union_query}) AS combined
            ORDER BY incubated_date DESC;
        """
        cur.execute(list_query, params + params)
        data_list = [dict(row) for row in cur.fetchall()]

        return jsonify({'trend': trend, 'data': data_list}), 200

    except Exception as e:
        print(f"Home ground startups error: {e}")
        return jsonify({'message': 'Failed to fetch home ground startups data.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@innovation_bp.route('/home-ground/filter-options', methods=['GET'])
@token_optional
def get_home_ground_filter_options(current_user_id):
    """Filter options (domain, status) for internal-origin startups from both tables."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        internal_filter = "LOWER(COALESCE(startup_origin, '')) = 'internal'"

        cur.execute(f"""
            SELECT DISTINCT domain FROM (
                SELECT domain FROM {IPTIF_STARTUP_TABLE} WHERE {internal_filter}
                UNION ALL
                SELECT domain FROM {TECHIN_STARTUP_TABLE} WHERE {internal_filter}
            ) AS combined
            WHERE domain IS NOT NULL
            ORDER BY domain;
        """)
        domains = [row['domain'] for row in cur.fetchall()]

        cur.execute(f"""
            SELECT DISTINCT status FROM (
                SELECT status FROM {IPTIF_STARTUP_TABLE} WHERE {internal_filter}
                UNION ALL
                SELECT status FROM {TECHIN_STARTUP_TABLE} WHERE {internal_filter}
            ) AS combined
            WHERE status IS NOT NULL
            ORDER BY status;
        """)
        statuses = [row['status'] for row in cur.fetchall()]

        return jsonify({'domains': domains, 'statuses': statuses}), 200

    except Exception as e:
        print(f"Home ground filter options error: {e}")
        return jsonify({'message': 'Failed to fetch filter options.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)

