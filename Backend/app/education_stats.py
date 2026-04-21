from datetime import date

from flask import Blueprint, jsonify, request
from psycopg2.errors import UndefinedTable

from .auth import token_required
from .db import get_db_connection

education_bp = Blueprint('education', __name__)

ENGAGEMENT_TYPES = ['Adjunct', 'Honorary', 'Visiting', 'FacultyFellow', 'PoP']
CATEGORY_KEYWORDS = {
    'Adjunct': ['Adjunct'],
    'Honorary': ['Honorary'],
    'Visiting': ['Visiting'],
    'FacultyFellow': ['Faculty Fellow', 'FacultyFellow'],
    'PoP': ['PoP', 'Professor of Practice', 'Practice']
}

def get_standardized_type_sql():
    """Returns a SQL CASE expression to standardize engagement_type based on keywords."""
    return """
        CASE
            WHEN engagement_type ILIKE '%%Adjunct%%' THEN 'Adjunct'
            WHEN engagement_type ILIKE '%%Honorary%%' THEN 'Honorary'
            WHEN engagement_type ILIKE '%%Visiting%%' THEN 'Visiting'
            WHEN engagement_type ILIKE '%%Faculty Fellow%%' OR engagement_type ILIKE '%%FacultyFellow%%' THEN 'FacultyFellow'
            WHEN engagement_type ILIKE '%%PoP%%' OR engagement_type ILIKE '%%Professor of Practice%%' OR engagement_type ILIKE '%%Practice%%' THEN 'PoP'
            ELSE NULL
        END
    """

def get_standardized_type_python(raw_type):
    """Returns the standardized engagement category for a raw string in Python."""
    if not raw_type:
        return None
    raw_type_lower = raw_type.lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in raw_type_lower:
                return cat
    return None

ENGAGEMENT_TABLE_NAME = 'faculty_engagement'


def build_filter_query(filters):
    conditions = []
    params = []

    mapping = {
        'year': 'year',
        'department': 'department',
        'engagement_type': 'engagement_type'
    }

    for key, column in mapping.items():
        value = filters.get(key)
        if value in (None, '', 'All'):
            continue
        if key == 'engagement_type':
            # For standardized filtering, match by keywords
            if value == 'FacultyFellow':
                conditions.append("(engagement_type ILIKE %s OR engagement_type ILIKE %s)")
                params.extend(["%Faculty Fellow%", "%FacultyFellow%"])
            elif value == 'PoP':
                conditions.append("(engagement_type ILIKE %s OR engagement_type ILIKE %s OR engagement_type ILIKE %s)")
                params.extend(["%PoP%", "%Professor of Practice%", "%Practice%"])
            else:
                conditions.append(f"{column} ILIKE %s")
                params.append(f"%{value}%")
        elif key == 'year':
            try:
                year_val = int(value)
                # Overlap logic: startdate should be on or before the end of the selected year,
                # and enddate should be on or after the beginning of the selected year.
                # startdate <= Y-12-31 AND (enddate IS NULL OR enddate >= Y-01-01)
                conditions.append("startdate <= %s AND (enddate IS NULL OR enddate >= %s)")
                params.extend([f"{year_val}-12-31", f"{year_val}-01-01"])
            except (ValueError, TypeError):
                continue
        else:
            conditions.append(f"{column} = %s")
            params.append(value)

    where_clause = ''
    if conditions:
        where_clause = 'WHERE ' + ' AND '.join(conditions)
    return where_clause, params


def fetch_rows(where_clause, params, extra_columns=''):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return None, 'Database connection failed.'
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT
                engagement_code,
                faculty_name,
                engagement_type,
                department,
                startdate,
                enddate,
                duration_months,
                year,
                remarks
                {extra_columns}
            FROM faculty_engagement
            {where_clause}
            """,
            params
        )
        rows = cur.fetchall()
        return rows, None
    except UndefinedTable:
        return None, f"Faculty engagement table '{ENGAGEMENT_TABLE_NAME}' is missing. Please run the latest schema migrations."
    except Exception as exc:
        print(f"Education stats error: {exc}")
        return None, 'Failed to fetch faculty engagement data.'
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
def faculty_engagement_table_exists():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return False
        cur = conn.cursor()
        cur.execute(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = %s
            ) AS exists_flag;
            """,
            (ENGAGEMENT_TABLE_NAME,)
        )
        row = cur.fetchone()
        return bool(row and row['exists_flag'])
    except Exception as exc:
        print(f"Education table existence check failed: {exc}")
        return False
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
def compute_summary(rows):
    today = date.today()
    summary_map = {eng_type: {'total': 0, 'active': 0} for eng_type in ENGAGEMENT_TYPES}
    for row in rows:
        engagement_type_raw = row.get('engagement_type')
        engagement_type = get_standardized_type_python(engagement_type_raw)
        
        if not engagement_type:
            continue

        if engagement_type not in summary_map:
            summary_map[engagement_type] = {'total': 0, 'active': 0}
        summary_map[engagement_type]['total'] += 1

        enddate = row.get('enddate')
        if enddate is None:
            summary_map[engagement_type]['active'] += 1
        elif isinstance(enddate, date) and enddate > today:
            summary_map[engagement_type]['active'] += 1

    overall_total = sum(item['total'] for item in summary_map.values())
    overall_active = sum(item['active'] for item in summary_map.values())

    return summary_map, overall_total, overall_active


@education_bp.route('/filter-options', methods=['GET'])
@token_required
def get_filter_options(current_user_id):
    if not faculty_engagement_table_exists():
        return jsonify({
            'message': (
                "Faculty engagement table not found. Please apply the latest schema.sql "
                "so the education dashboards can load data."
            )
        }), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                MIN(EXTRACT(YEAR FROM startdate))::int AS min_year,
                MAX(EXTRACT(YEAR FROM enddate))::int AS max_year,
                MAX(EXTRACT(YEAR FROM startdate))::int AS max_start_year,
                ARRAY(
                    SELECT DISTINCT department FROM faculty_engagement
                    WHERE department IS NOT NULL AND department <> ''
                    ORDER BY department
                ) AS departments,
                ARRAY(
                    SELECT DISTINCT engagement_type FROM faculty_engagement
                    ORDER BY engagement_type
                ) AS engagement_types
            FROM faculty_engagement
            """
        )
        row = cur.fetchone()
        
        years = []
        if row and row['min_year'] is not None:
            min_y = row['min_year']
            max_y = row['max_year']
            
            # Check for ongoing engagements to decide if we should extend the range to the current year
            cur.execute("SELECT EXISTS(SELECT 1 FROM faculty_engagement WHERE enddate IS NULL) AS has_ongoing_flag")
            ongoing_row = cur.fetchone()
            has_ongoing = ongoing_row['has_ongoing_flag'] if ongoing_row else False
            
            # Upper bound is the max of (max_year, max_start_year, and current year if ongoing)
            potential_max = [min_y]
            if max_y is not None: potential_max.append(max_y)
            if row['max_start_year'] is not None: potential_max.append(row['max_start_year'])
            if has_ongoing: potential_max.append(date.today().year)
            
            max_y = max(potential_max)
            years = list(range(max_y, min_y - 1, -1))

        return jsonify({
            'years': years,
            'departments': row['departments'] if row and row['departments'] else [],
            'engagement_types': ENGAGEMENT_TYPES
        }), 200
    except Exception as exc:
        print(f"Education filter options error: {exc}")
        return jsonify({'message': 'Failed to fetch filter options.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@education_bp.route('/summary', methods=['GET'])
@token_required
def get_summary(current_user_id):
    if not faculty_engagement_table_exists():
        return jsonify({
            'message': (
                "Faculty engagement table not found. Please apply the latest schema.sql "
                "so the education dashboards can load data."
            )
        }), 500

    filters = {
        'year': request.args.get('year'),
        'department': request.args.get('department'),
        'engagement_type': request.args.get('engagement_type')
    }
    where_clause, params = build_filter_query(filters)
    rows, error = fetch_rows(where_clause, params)
    if error:
        return jsonify({'message': error}), 500

    summary_map, overall_total, overall_active = compute_summary(rows)

    summary_list = []
    for eng_type in ENGAGEMENT_TYPES:
        data = summary_map.get(eng_type, {'total': 0, 'active': 0})
        summary_list.append({
            'engagement_type': eng_type,
            'total': data['total'],
            'active': data['active']
        })

    return jsonify({
        'data': {
            'summary': summary_list,
            'overall_total': overall_total,
            'overall_active': overall_active,
            'filters_applied': filters
        }
    }), 200


@education_bp.route('/department-breakdown', methods=['GET'])
@token_required
def get_department_breakdown(current_user_id):
    if not faculty_engagement_table_exists():
        return jsonify({
            'message': (
                "Faculty engagement table not found. Please apply the latest schema.sql "
                "so the education dashboards can load data."
            )
        }), 500

    filters = {
        'year': request.args.get('year'),
        'department': request.args.get('department'),
        'engagement_type': request.args.get('engagement_type')
    }
    where_clause, params = build_filter_query(filters)

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT department,
                   {get_standardized_type_sql()} AS std_type,
                   COUNT(*) AS total,
                   SUM(
                       CASE
                           WHEN enddate IS NULL OR enddate > CURRENT_DATE THEN 1
                           ELSE 0
                       END
                   ) AS active
            FROM faculty_engagement
            {where_clause}
            GROUP BY department, std_type
            HAVING {get_standardized_type_sql()} IS NOT NULL
            ORDER BY department, std_type
            """,
            params
        )
        rows = cur.fetchall()

        breakdown_map = {}
        for row in rows:
            dept = row['department'] or 'Unknown'
            if dept not in breakdown_map:
                breakdown_map[dept] = {
                    'department': dept,
                    'details': {eng_type: {'total': 0, 'active': 0} for eng_type in ENGAGEMENT_TYPES}
                }
            breakdown_map[dept]['details'][row['std_type']] = {
                'total': row['total'],
                'active': row['active']
            }

        formatted = []
        for dept, data in sorted(breakdown_map.items()):
            entry = {'department': dept}
            totals = 0
            actives = 0
            for eng_type in ENGAGEMENT_TYPES:
                entry[f"{eng_type}_total"] = data['details'][eng_type]['total']
                entry[f"{eng_type}_active"] = data['details'][eng_type]['active']
                totals += data['details'][eng_type]['total']
                actives += data['details'][eng_type]['active']
            entry['total'] = totals
            entry['active'] = actives
            formatted.append(entry)

        return jsonify({'data': formatted}), 200
    except UndefinedTable:
        return jsonify({
            'message': (
                "Faculty engagement table not found. Please apply the latest schema.sql "
                "so the education dashboards can load data."
            )
        }), 500
    except Exception as exc:
        print(f"Education department breakdown error: {exc}")
        return jsonify({'message': 'Failed to fetch department breakdown.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@education_bp.route('/year-trend', methods=['GET'])
@token_required
def get_year_trend(current_user_id):
    if not faculty_engagement_table_exists():
        return jsonify({
            'message': (
                "Faculty engagement table not found. Please apply the latest schema.sql "
                "so the education dashboards can load data."
            )
        }), 500

    filters = {
        'year': request.args.get('year'),
        'department': request.args.get('department'),
        'engagement_type': request.args.get('engagement_type')
    }
    where_clause, params = build_filter_query(filters)

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT year,
                   {get_standardized_type_sql()} AS std_type,
                   COUNT(*) AS total
            FROM faculty_engagement
            {where_clause}
            GROUP BY year, std_type
            HAVING {get_standardized_type_sql()} IS NOT NULL
            ORDER BY year ASC, std_type
            """,
            params
        )
        rows = cur.fetchall()

        trend_map = {}
        for row in rows:
            year = row['year']
            if year is None:
                continue
            if year not in trend_map:
                trend_map[year] = {eng_type: 0 for eng_type in ENGAGEMENT_TYPES}
                trend_map[year]['year'] = year
            trend_map[year][row['std_type']] = row['total']

        trend_list = [trend_map[year] for year in sorted(trend_map.keys())]
        return jsonify({'data': trend_list}), 200
    except UndefinedTable:
        return jsonify({
            'message': (
                "Faculty engagement table not found. Please apply the latest schema.sql "
                "so the education dashboards can load data."
            )
        }), 500
    except Exception as exc:
        print(f"Education year trend error: {exc}")
        return jsonify({'message': 'Failed to fetch year trend.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@education_bp.route('/type-distribution', methods=['GET'])
@token_required
def get_type_distribution(current_user_id):
    if not faculty_engagement_table_exists():
        return jsonify({
            'message': (
                "Faculty engagement table not found. Please apply the latest schema.sql "
                "so the education dashboards can load data."
            )
        }), 500

    filters = {
        'year': request.args.get('year'),
        'department': request.args.get('department'),
        'engagement_type': request.args.get('engagement_type')
    }
    where_clause, params = build_filter_query(filters)

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT {get_standardized_type_sql()} AS std_type,
                   COUNT(*) AS total
            FROM faculty_engagement
            {where_clause}
            GROUP BY std_type
            HAVING {get_standardized_type_sql()} IS NOT NULL
            ORDER BY std_type
            """,
            params
        )
        rows = cur.fetchall()
        distribution = [{'engagement_type': row['std_type'], 'total': row['total']} for row in rows]
        return jsonify({'data': distribution}), 200
    except UndefinedTable:
        return jsonify({
            'message': (
                "Faculty engagement table not found. Please apply the latest schema.sql "
                "so the education dashboards can load data."
            )
        }), 500
    except Exception as exc:
        print(f"Education type distribution error: {exc}")
        return jsonify({'message': 'Failed to fetch type distribution.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@education_bp.route('/list', methods=['GET'])
@token_required
def get_faculty_engagement_list(current_user_id):
    if not faculty_engagement_table_exists():
        return jsonify({
            'message': (
                "Faculty engagement table not found. Please apply the latest schema.sql "
                "so the education dashboards can load data."
            )
        }), 500

    filters = {
        'year': request.args.get('year'),
        'department': request.args.get('department'),
        'engagement_type': request.args.get('engagement_type')
    }
    where_clause, params = build_filter_query(filters)

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT
                engagement_code,
                faculty_name,
                engagement_type,
                {get_standardized_type_sql()} AS std_type,
                department,
                startdate,
                enddate,
                duration_months,
                year,
                remarks,
                fc_bg_type
            FROM faculty_engagement
            {where_clause}
            ORDER BY year DESC, faculty_name ASC
            """,
            params
        )
        rows = cur.fetchall()
        
        # Convert rows to list of dicts
        result = []
        for row in rows:
            result.append({
                'engagement_code': row.get('engagement_code'),
                'faculty_name': row.get('faculty_name'),
                'engagement_type': row.get('engagement_type'),
                'department': row.get('department'),
                'startdate': row.get('startdate').isoformat() if row.get('startdate') else None,
                'enddate': row.get('enddate').isoformat() if row.get('enddate') else None,
                'duration_months': row.get('duration_months'),
                'year': row.get('year'),
                'remarks': row.get('remarks'),
                'fc_bg_type': row.get('fc_bg_type')
            })
        
        return jsonify({'data': result}), 200
    except UndefinedTable:
        return jsonify({
            'message': (
                "Faculty engagement table not found. Please apply the latest schema.sql "
                "so the education dashboards can load data."
            )
        }), 500
    except Exception as exc:
        print(f"Education list error: {exc}")
        return jsonify({'message': 'Failed to fetch faculty engagement list.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

