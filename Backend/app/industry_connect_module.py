"""
Blueprint providing analytics for the Industry Connect module:
- ICSR Section: Industry Interaction Events
- Industry-Academia Conclave Coordinator
"""
from flask import Blueprint, jsonify, request
from psycopg2 import extras

from .auth import token_optional
from .db import get_db_connection, release_db_connection


industry_connect_bp = Blueprint('industry_connect', __name__)

INDUSTRY_EVENTS_TABLE = 'industry_events'
INDUSTRY_CONCLAVE_TABLE = 'industry_conclave'


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
    """Check if industry connect tables exist."""
    conn = get_db_connection()
    if not conn:
        return False
    try:
        return (
            _table_exists(conn, INDUSTRY_EVENTS_TABLE)
            and _table_exists(conn, INDUSTRY_CONCLAVE_TABLE)
        )
    finally:
        release_db_connection(conn)


def _build_events_where_clause(filters: dict) -> tuple[str, list]:
    """Build WHERE clause and params for industry_events filtering."""
    conditions = []
    params = []

    if filters.get('event_type') and filters.get('event_type') != 'All':
        conditions.append("event_type = %s")
        params.append(filters['event_type'])

    if filters.get('year') and filters.get('year') != 'All':
        conditions.append("COALESCE(year, EXTRACT(YEAR FROM date_of_event)::INT) = %s")
        params.append(int(filters['year']))

    if filters.get('search'):
        conditions.append(
            "(event_name ILIKE %s OR hosted_by ILIKE %s OR target_audience ILIKE %s)"
        )
        search_pattern = f"%{filters['search']}%"
        params.extend([search_pattern, search_pattern, search_pattern])

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
    return where_clause, params


# ========== ICSR Section Endpoints ==========

@industry_connect_bp.route('/icsr/summary', methods=['GET'])
@token_optional
def get_icsr_summary(current_user_id):
    """Get summary statistics for ICSR industry events."""
    if not _data_available():
        return jsonify({'message': 'Industry connect tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        filters = {
            'event_type': request.args.get('event_type'),
            'year': request.args.get('year'),
            'search': request.args.get('search', '').strip()
        }
        where_clause, params = _build_events_where_clause(filters)

        # Total number of industry events
        cur.execute(f"SELECT COUNT(*) as total FROM {INDUSTRY_EVENTS_TABLE} {where_clause};", params)
        total_events = cur.fetchone()['total'] or 0

        # Total funding amount
        cur.execute(f"SELECT COALESCE(SUM(amount), 0) as total_amount FROM {INDUSTRY_EVENTS_TABLE} {where_clause};", params)
        total_amount = float(cur.fetchone()['total_amount'] or 0)

        return jsonify({
            'total_events': total_events,
            'total_funding': total_amount
        }), 200

    except Exception as e:
        print(f"ICSR summary error: {e}")
        return jsonify({'message': 'Failed to fetch ICSR summary statistics.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@industry_connect_bp.route('/icsr/yearly-distribution', methods=['GET'])
@token_optional
def get_icsr_yearly_distribution(current_user_id):
    """Get year-wise distribution of industry events."""
    if not _data_available():
        return jsonify({'message': 'Industry connect tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        filters = {
            'event_type': request.args.get('event_type'),
            'year': request.args.get('year'),
            'search': request.args.get('search', '').strip()
        }
        where_clause, params = _build_events_where_clause(filters)

        # Use the 'year' column directly (falls back to date_of_event if year is NULL)
        cur.execute(f"""
            SELECT
                COALESCE(year, EXTRACT(YEAR FROM date_of_event)::INT) as year,
                COUNT(*) as event_count
            FROM {INDUSTRY_EVENTS_TABLE}
            {where_clause}
            GROUP BY COALESCE(year, EXTRACT(YEAR FROM date_of_event)::INT)
            ORDER BY year ASC;
        """, params)
        yearly_data = cur.fetchall()

        result = [
            {'year': row['year'], 'event_count': row['event_count'] or 0}
            for row in yearly_data
        ]

        return jsonify({'data': result}), 200

    except Exception as e:
        print(f"ICSR yearly distribution error: {e}")
        return jsonify({'message': 'Failed to fetch yearly distribution.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@industry_connect_bp.route('/icsr/event-types', methods=['GET'])
@token_optional
def get_icsr_event_types(current_user_id):
    """Get event types distribution (frequency by type)."""
    if not _data_available():
        return jsonify({'message': 'Industry connect tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        filters = {
            'event_type': request.args.get('event_type'),
            'year': request.args.get('year'),
            'search': request.args.get('search', '').strip()
        }
        where_clause, params = _build_events_where_clause(filters)

        cur.execute(f"""
            SELECT event_type, COUNT(*) as count
            FROM {INDUSTRY_EVENTS_TABLE}
            {where_clause}
            GROUP BY event_type
            ORDER BY count DESC;
        """, params)
        type_data = cur.fetchall()

        result = [
            {'event_type': row['event_type'], 'count': row['count'] or 0}
            for row in type_data
        ]

        return jsonify({'data': result}), 200

    except Exception as e:
        print(f"ICSR event types error: {e}")
        return jsonify({'message': 'Failed to fetch event types distribution.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@industry_connect_bp.route('/icsr/events', methods=['GET'])
@token_optional
def get_icsr_events(current_user_id):
    """Get list of industry events with filtering and pagination."""
    if not _data_available():
        return jsonify({'message': 'Industry connect tables are missing.'}), 500

    filters = {
        'event_type': request.args.get('event_type'),
        'year': request.args.get('year'),
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
        where_clause, params = _build_events_where_clause(filters)

        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM {INDUSTRY_EVENTS_TABLE} {where_clause};"
        cur.execute(count_query, params)
        total = cur.fetchone()['total'] or 0

        # Get events
        query = f"""
            SELECT
                project_id,
                event_name,
                event_type,
                date_of_event,
                target_audience,
                hosted_by,
                funding_by,
                amount,
                year
            FROM {INDUSTRY_EVENTS_TABLE}
            {where_clause}
            ORDER BY date_of_event DESC NULLS LAST, event_name ASC
            LIMIT %s OFFSET %s;
        """
        cur.execute(query, params + [per_page, offset])
        events = cur.fetchall()

        result = []
        for row in events:
            result.append({
                'project_id': row['project_id'],
                'event_name': row['event_name'],
                'event_type': row['event_type'],
                'date_of_event': row['date_of_event'].isoformat() if row['date_of_event'] else None,
                'target_audience': row['target_audience'],
                'hosted_by': row['hosted_by'],
                'funding_by': row['funding_by'],
                'amount': float(row['amount']) if row['amount'] else None,
                'year': row['year']
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
        print(f"ICSR events list error: {e}")
        return jsonify({'message': 'Failed to fetch events list.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@industry_connect_bp.route('/icsr/filter-options', methods=['GET'])
@token_optional
def get_icsr_filter_options(current_user_id):
    """Get filter options for ICSR events with cross-filtering."""
    if not _data_available():
        return jsonify({'message': 'Industry connect tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500

        active_event_type = request.args.get('event_type')
        active_year = request.args.get('year')
        def clean(v): return None if (v is None or v in ('', 'All')) else v
        active_event_type = clean(active_event_type)
        active_year = clean(active_year)

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        # Event types: filter by year only
        year_cond = "WHERE COALESCE(year, EXTRACT(YEAR FROM date_of_event)::INT) = %s AND event_type IS NOT NULL" if active_year else "WHERE event_type IS NOT NULL"
        year_params = [int(active_year)] if active_year else []
        cur.execute(f"SELECT DISTINCT event_type FROM {INDUSTRY_EVENTS_TABLE} {year_cond} ORDER BY event_type;", year_params)
        event_types = [row['event_type'] for row in cur.fetchall()]

        # Years: filter by event_type only
        type_cond = "WHERE event_type = %s AND COALESCE(year, EXTRACT(YEAR FROM date_of_event)::INT) IS NOT NULL" if active_event_type else "WHERE COALESCE(year, EXTRACT(YEAR FROM date_of_event)::INT) IS NOT NULL"
        type_params = [active_event_type] if active_event_type else []
        cur.execute(f"""
            SELECT DISTINCT COALESCE(year, EXTRACT(YEAR FROM date_of_event)::INT) as year
            FROM {INDUSTRY_EVENTS_TABLE}
            {type_cond}
            ORDER BY year DESC;
        """, type_params)
        years = [row['year'] for row in cur.fetchall()]

        return jsonify({
            'event_types': event_types,
            'years': years
        }), 200

    except Exception as e:
        print(f"ICSR filter options error: {e}")
        return jsonify({'message': 'Failed to fetch filter options.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


# ========== Industry-Academia Conclave Endpoints ==========

@industry_connect_bp.route('/conclave/summary', methods=['GET'])
@token_optional
def get_conclave_summary(current_user_id):
    """Get summary statistics for Industry-Academia Conclave."""
    if not _data_available():
        return jsonify({'message': 'Industry connect tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        # Total number of conclaves
        cur.execute(f"SELECT COUNT(*) as total FROM {INDUSTRY_CONCLAVE_TABLE};")
        total_conclaves = cur.fetchone()['total'] or 0

        # Total companies across all conclaves
        cur.execute(f"SELECT COALESCE(SUM(number_of_com), 0) as total FROM {INDUSTRY_CONCLAVE_TABLE};")
        total_companies = cur.fetchone()['total'] or 0

        return jsonify({
            'total_conclaves': total_conclaves,
            'total_companies': int(total_companies)
        }), 200

    except Exception as e:
        print(f"Conclave summary error: {e}")
        return jsonify({'message': 'Failed to fetch conclave summary.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@industry_connect_bp.route('/conclave/list', methods=['GET'])
@token_optional
def get_conclave_list(current_user_id):
    """Get list of all Industry-Academia Conclaves."""
    if not _data_available():
        return jsonify({'message': 'Industry connect tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        # Get all conclaves ordered by start_date (most recent first)
        cur.execute(f"""
            SELECT
                conclave_id,
                start_date,
                end_date,
                theme,
                focus_area,
                number_of_com,
                sessions_held,
                key_speakers,
                event_photos_url,
                brochure_url,
                description
            FROM {INDUSTRY_CONCLAVE_TABLE}
            ORDER BY start_date DESC NULLS LAST;
        """)
        conclaves = cur.fetchall()

        result = []
        for row in conclaves:
            result.append({
                'conclave_id': row['conclave_id'],
                'start_date': row['start_date'].isoformat() if row['start_date'] else None,
                'end_date': row['end_date'].isoformat() if row['end_date'] else None,
                'year': row['start_date'].year if row['start_date'] else None,
                'theme': row['theme'],
                'focus_area': row['focus_area'],
                'number_of_companies': row['number_of_com'] or 0,
                'sessions_held': row['sessions_held'],
                'key_speakers': row['key_speakers'],
                'event_photos_url': row['event_photos_url'],
                'brochure_url': row['brochure_url'],
                'description': row['description']
            })

        return jsonify({'data': result}), 200

    except Exception as e:
        print(f"Conclave list error: {e}")
        return jsonify({'message': 'Failed to fetch conclave list.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)
