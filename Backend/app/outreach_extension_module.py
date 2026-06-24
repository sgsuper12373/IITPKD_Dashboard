"""Analytics for the Outreach & Extension module: Open House, NPTEL, and UBA."""
from flask import Blueprint, jsonify, request
from psycopg2 import extras

from .auth import token_optional
from .db import get_db_connection, release_db_connection


outreach_extension_bp = Blueprint('outreach_extension', __name__)

OPEN_HOUSE_TABLE = 'open_house'
UBA_PROJECTS_TABLE = 'uba_projects'
UBA_EVENTS_TABLE = 'uba_events'


def _table_exists(conn, table_name: str) -> bool:
    """Returns True if the given table exists in the public schema."""
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND LOWER(table_name) = LOWER(%s));",
            (table_name,),
        )
        result = cur.fetchone()
        return bool(result.get('exists', False) if isinstance(result, dict) else (result[0] if result else False))
    except Exception:
        return False
    finally:
        cur.close()


def _data_available() -> bool:
    """Check if outreach extension tables exist."""
    conn = get_db_connection()
    if not conn:
        return False
    try:
        return (
            _table_exists(conn, OPEN_HOUSE_TABLE) and
            _table_exists(conn, UBA_PROJECTS_TABLE) and
            _table_exists(conn, UBA_EVENTS_TABLE)
        )
    finally:
        release_db_connection(conn)



@outreach_extension_bp.route('/open-house/summary', methods=['GET'])
@token_optional
def get_open_house_summary(current_user_id):
    """Get summary statistics for Open House events."""
    if not _data_available():
        return jsonify({'message': 'Outreach extension tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        # Total Open House Events
        cur.execute(f"SELECT COUNT(*) as total FROM {OPEN_HOUSE_TABLE};")
        total_events = cur.fetchone()['total'] or 0
        
        # Total Visitors
        cur.execute(f"SELECT COALESCE(SUM(total_visitors), 0) as total FROM {OPEN_HOUSE_TABLE};")
        total_visitors = cur.fetchone()['total'] or 0
        
        # Number of Participating Departments (count unique departments from all events)
        # We'll count the maximum number of unique departments across all events
        # Handle case where column might not exist or table is empty
        try:
            cur.execute(f"""
                SELECT COUNT(DISTINCT TRIM(unnest(string_to_array(departments_participated, ',')))) as total
                FROM {OPEN_HOUSE_TABLE}
                WHERE departments_participated IS NOT NULL AND departments_participated != '';
            """)
            result = cur.fetchone()
            departments_count = result['total'] or 0 if result else 0
        except Exception as dept_error:
            # If departments_participated column doesn't exist or query fails, try alternative
            print(f"Department count query error (non-fatal): {dept_error}")
            # Fallback: use num_departments if available, otherwise 0
            try:
                cur.execute(f"""
                    SELECT COUNT(DISTINCT num_departments) as total
                    FROM {OPEN_HOUSE_TABLE}
                    WHERE num_departments IS NOT NULL;
                """)
                result = cur.fetchone()
                departments_count = result['total'] or 0 if result else 0
            except Exception:
                departments_count = 0
        
        return jsonify({
            'total_events': total_events,
            'total_visitors': total_visitors,
            'departments_participated': departments_count
        }), 200
        
    except Exception as e:
        print(f"Open House summary error: {e}")
        return jsonify({
            'message': 'Failed to fetch Open House summary statistics.',
        }), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@outreach_extension_bp.route('/open-house/list', methods=['GET'])
@token_optional
def get_open_house_list(current_user_id):
    """Get paginated list of Open House events with search and filter."""
    if not _data_available():
        return jsonify({'message': 'Outreach extension tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '', type=str).strip()
        year_filter = request.args.get('year', type=int)
        
        # Build WHERE clause
        where_conditions = []
        params = []
        
        if search:
            where_conditions.append("(theme ILIKE %s OR target_audience ILIKE %s OR departments_participated ILIKE %s)")
            search_pattern = f'%{search}%'
            params.extend([search_pattern, search_pattern, search_pattern])
        
        if year_filter:
            where_conditions.append("event_year = %s")
            params.append(year_filter)
        
        where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM {OPEN_HOUSE_TABLE} {where_clause};"
        cur.execute(count_query, params)
        total = cur.fetchone()['total'] or 0
        
        # Get paginated data
        offset = (page - 1) * per_page
        query = f"""
            SELECT 
                event_id,
                event_year,
                event_date,
                theme,
                target_audience,
                departments_participated,
                num_departments,
                total_visitors,
                key_highlights,
                photos_url,
                poster_url,
                brochure_url
            FROM {OPEN_HOUSE_TABLE}
            {where_clause}
            ORDER BY event_year DESC, event_date DESC
            LIMIT %s OFFSET %s;
        """
        params.extend([per_page, offset])
        cur.execute(query, params)
        events = cur.fetchall()
        
        return jsonify({
            'events': [dict(event) for event in events],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        }), 200
        
    except Exception as e:
        print(f"Open House list error: {e}")
        return jsonify({'message': 'Failed to fetch Open House events.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@outreach_extension_bp.route('/open-house/timeline', methods=['GET'])
@token_optional
def get_open_house_timeline(current_user_id):
    """Get year-wise timeline data for Open House events."""
    if not _data_available():
        return jsonify({'message': 'Outreach extension tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        cur.execute(f"""
            SELECT 
                event_year,
                COUNT(*) as event_count,
                COALESCE(SUM(total_visitors), 0) as total_visitors,
                COALESCE(AVG(num_departments), 0) as avg_departments
            FROM {OPEN_HOUSE_TABLE}
            GROUP BY event_year
            ORDER BY event_year ASC;
        """)
        timeline = cur.fetchall()
        
        return jsonify({
            'timeline': [dict(row) for row in timeline]
        }), 200
        
    except Exception as e:
        print(f"Open House timeline error: {e}")
        return jsonify({'message': 'Failed to fetch Open House timeline.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)



@outreach_extension_bp.route('/nptel/summary', methods=['GET'])
@token_optional
def get_nptel_summary(current_user_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        cur.execute("SELECT COUNT(id) as total_courses, COALESCE(SUM(enrollments), 0) as total_enrollments FROM nptel_courses;")
        res = cur.fetchone()
        
        return jsonify({
            'total_courses': res['total_courses'] or 0,
            'total_enrollments': res['total_enrollments'] or 0
        }), 200
    except Exception as e:
        print(f"NPTEL summary error: {e}")
        return jsonify({'message': 'Failed to fetch NPTEL summary.'}), 500
    finally:
        if cur: cur.close()
        if conn: release_db_connection(conn)

@outreach_extension_bp.route('/nptel/trend', methods=['GET'])
@token_optional
def get_nptel_trend(current_user_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        cur.execute("""
            SELECT 
                EXTRACT(YEAR FROM offering_year)::INT as year, 
                COUNT(id) as courses, 
                COALESCE(SUM(enrollments), 0) as enrollments 
            FROM nptel_courses 
            WHERE offering_year IS NOT NULL
            GROUP BY EXTRACT(YEAR FROM offering_year)
            ORDER BY year ASC;
        """)
        trend = cur.fetchall()
        
        return jsonify({
            'trend': [dict(t) for t in trend]
        }), 200
    except Exception as e:
        print(f"NPTEL trend error: {e}")
        return jsonify({'message': 'Failed to fetch NPTEL trend.'}), 500
    finally:
        if cur: cur.close()
        if conn: release_db_connection(conn)

@outreach_extension_bp.route('/nptel/list', methods=['GET'])
@token_optional
def get_nptel_list(current_user_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        cur.execute("""
            SELECT 
                id,
                course_name,
                department,
                faculty_name,
                enrollments,
                EXTRACT(YEAR FROM offering_year)::INT as offering_year
            FROM nptel_courses
            ORDER BY offering_year DESC NULLS LAST, course_name ASC;
        """)
        courses = cur.fetchall()
        
        return jsonify({
            'courses': [dict(c) for c in courses]
        }), 200
    except Exception as e:
        print(f"NPTEL list error: {e}")
        return jsonify({'message': 'Failed to fetch NPTEL list.'}), 500
    finally:
        if cur: cur.close()
        if conn: release_db_connection(conn)



@outreach_extension_bp.route('/uba/summary', methods=['GET'])
@token_optional
def get_uba_summary(current_user_id):
    """Get summary statistics for UBA."""
    if not _data_available():
        return jsonify({'message': 'Outreach extension tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        # Total Projects
        cur.execute(f"SELECT COUNT(*) as total FROM {UBA_PROJECTS_TABLE};")
        total_projects = cur.fetchone()['total'] or 0
        
        # Number of Events
        cur.execute(f"SELECT COUNT(*) as total FROM {UBA_EVENTS_TABLE};")
        total_events = cur.fetchone()['total'] or 0
        
        return jsonify({
            'total_projects': total_projects,
            'total_events': total_events
        }), 200
        
    except Exception as e:
        print(f"UBA summary error: {e}")
        return jsonify({'message': 'Failed to fetch UBA summary statistics.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@outreach_extension_bp.route('/uba/projects', methods=['GET'])
@token_optional
def get_uba_projects(current_user_id):
    """Get list of UBA projects with events."""
    if not _data_available():
        return jsonify({'message': 'Outreach extension tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        
        cur.execute(f"""
            SELECT
                project_id,
                project_title,
                coordinator_name,
                intervention_description,
                project_status,
                start_date,
                end_date,
                collaboration_partners
            FROM {UBA_PROJECTS_TABLE}
            ORDER BY start_date DESC NULLS LAST, project_id DESC;
        """)
        projects = cur.fetchall()
        
        return jsonify({
            'projects': [dict(project) for project in projects]
        }), 200
        
    except Exception as e:
        print(f"UBA projects error: {e}")
        return jsonify({'message': 'Failed to fetch UBA projects.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@outreach_extension_bp.route('/outreach/list', methods=['GET'])
@token_optional
def get_outreach_list(current_user_id):
    """Get list of records from the outreach table, optionally filtered by program_name."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500

        if not _table_exists(conn, 'outreach'):
            return jsonify({'records': []}), 200

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        program_filter = request.args.get('program_name', '', type=str).strip()
        where_clause = ''
        params = []
        if program_filter:
            where_clause = 'WHERE program_name ILIKE %s'
            params.append(f'%{program_filter}%')

        cur.execute(f"""
            SELECT
                id, academic_year, program_name, program_type, engagement_type,
                association, start_date, end_date, targeted_audience,
                num_attendees, num_schools, num_colleges, geographic_reach,
                remarks, created_by, created_at,
                sq_stipend_provided, sq_travel_allowance, sq_num_lab_sessions, sq_districts_covered,
                pmc_target_class, pmc_mathematician_led, pmc_num_sessions,
                pbd_lecture_topic, pbd_speaker_name, pbd_speaker_affiliation,
                iv_visiting_institution, iv_visiting_institution_type, iv_num_groups,
                nss_activity_type, nss_volunteer_count, nss_community_reached,
                extra_data
            FROM outreach
            {where_clause}
            ORDER BY academic_year DESC, id ASC;
        """, params)

        records = cur.fetchall()
        return jsonify({'records': [dict(r) for r in records]}), 200

    except Exception as e:
        print(f"Outreach list error: {e}")
        return jsonify({'message': 'Failed to fetch outreach records.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@outreach_extension_bp.route('/uba/events', methods=['GET'])
@token_optional
def get_uba_events(current_user_id):
    """Get all UBA events, optionally filtered by year."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500

        if not _table_exists(conn, UBA_EVENTS_TABLE):
            return jsonify({'events': []}), 200

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        year_filter = request.args.get('year', '', type=str).strip()
        where_clause = ''
        params = []
        if year_filter:
            where_clause = 'WHERE year = %s'
            params.append(year_filter)

        cur.execute(f"""
            SELECT
                id,
                year,
                program_name,
                program_type,
                association,
                start_date,
                end_date,
                targeted_audience,
                num_attendees,
                num_schools,
                num_colleges,
                geographic_reach,
                remarks
            FROM {UBA_EVENTS_TABLE}
            {where_clause}
            ORDER BY start_date DESC NULLS LAST, id ASC;
        """, params)
        events = cur.fetchall()

        return jsonify({'events': [dict(e) for e in events]}), 200

    except Exception as e:
        print(f"UBA events error: {e}")
        return jsonify({'message': 'Failed to fetch UBA events.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)

