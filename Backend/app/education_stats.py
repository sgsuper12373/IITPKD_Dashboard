from datetime import date

from flask import Blueprint, jsonify, request
from psycopg2.errors import UndefinedTable

from .auth import token_optional
from .db import get_db_connection, release_db_connection

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
    if not raw_type:
        return None
    raw_type_lower = raw_type.lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in raw_type_lower:
                return cat
    return None

ENGAGEMENT_TABLE_NAME = 'faculty_engagement'


def get_cutoff_date(year_str):
    today = date.today()
    if not year_str or year_str in ('', 'All'):
        return today
    try:
        year_val = int(year_str)
        if year_val >= today.year:
            return today
        return date(year_val, 12, 31)
    except (ValueError, TypeError):
        return today


def build_filter_query(filters):
    conditions = []
    params = []

    year_str = filters.get('year')
    if year_str and year_str not in ('', 'All'):
        try:
            year_val = int(year_str)
            cutoff = get_cutoff_date(year_str)
            year_start = date(year_val, 1, 1)
            conditions.append(
                "startdate <= %s AND (enddate IS NULL OR enddate >= %s)"
            )
            params.extend([cutoff, year_start])
        except (ValueError, TypeError):
            pass

    if filters.get('department') not in (None, '', 'All'):
        conditions.append("department = %s")
        params.append(filters['department'])

    engagement_type = filters.get('engagement_type')
    if engagement_type not in (None, '', 'All'):
        if engagement_type == 'FacultyFellow':
            conditions.append(
                "(engagement_type ILIKE %s OR engagement_type ILIKE %s)"
            )
            params.extend(["%Faculty Fellow%", "%FacultyFellow%"])
        elif engagement_type == 'PoP':
            conditions.append(
                "(engagement_type ILIKE %s OR engagement_type ILIKE %s OR engagement_type ILIKE %s)"
            )
            params.extend(["%PoP%", "%Professor of Practice%", "%Practice%"])
        else:
            conditions.append("engagement_type ILIKE %s")
            params.append(f"%{engagement_type}%")

    where_clause = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''
    return where_clause, params


def active_sql():
    return "CASE WHEN enddate IS NULL OR enddate >= %s::date THEN 1 ELSE 0 END"


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
            release_db_connection(conn)


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
            release_db_connection(conn)


def compute_summary(rows, year_str=None):
    cutoff = get_cutoff_date(year_str)
    summary_map = {eng_type: {'active': 0} for eng_type in ENGAGEMENT_TYPES}

    for row in rows:
        engagement_type = get_standardized_type_python(row.get('engagement_type'))
        if not engagement_type:
            continue
        enddate = row.get('enddate')
        if enddate is not None and isinstance(enddate, str):
            try:
                from datetime import datetime
                enddate = datetime.strptime(enddate, "%Y-%m-%d").date()
            except Exception:
                enddate = None
        if (enddate is None) or (enddate >= cutoff):
            summary_map[engagement_type]['active'] += 1

    overall_active = sum(v['active'] for v in summary_map.values())
    return summary_map, overall_active


# ── Routes ────────────────────────────────────────────────────────────────────

@education_bp.route('/filter-options', methods=['GET'])
@token_optional
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

        current_filters = {
            'year': request.args.get('year'),
            'department': request.args.get('department'),
            'engagement_type': request.args.get('engagement_type')
        }
        for k, v in current_filters.items():
            if v == 'All' or v == '':
                current_filters[k] = None

        def get_where_except(exclude_key):
            temp_filters = {k: v for k, v in current_filters.items() if k != exclude_key}
            return build_filter_query(temp_filters)

        filter_options = {}

        # Departments
        where_clause, params = get_where_except('department')
        cur.execute(f"SELECT DISTINCT department FROM faculty_engagement {where_clause} {'AND' if where_clause else 'WHERE'} department IS NOT NULL AND department <> '' ORDER BY department", params)
        filter_options['departments'] = [row['department'] for row in cur.fetchall() if row['department']]

        # Years (Calculate min/max based on other filters)
        where_clause, params = get_where_except('year')
        cur.execute(
            f"""
            SELECT
                MIN(EXTRACT(YEAR FROM startdate))::int AS min_year,
                MAX(EXTRACT(YEAR FROM enddate))::int AS max_year,
                MAX(EXTRACT(YEAR FROM startdate))::int AS max_start_year
            FROM faculty_engagement
            {where_clause}
            """, params
        )
        row = cur.fetchone()

        years = []
        current_year = date.today().year
        if row and row['min_year'] is not None:
            min_y = row['min_year']

            cur.execute(
                f"SELECT EXISTS(SELECT 1 FROM faculty_engagement {where_clause} {'AND' if where_clause else 'WHERE'} enddate IS NULL) AS has_ongoing_flag", params
            )
            ongoing_row = cur.fetchone()
            has_ongoing = ongoing_row['has_ongoing_flag'] if ongoing_row else False

            potential_max = [min_y]
            if row['max_year'] is not None:
                potential_max.append(row['max_year'])
            if row['max_start_year'] is not None:
                potential_max.append(row['max_start_year'])
            if has_ongoing:
                potential_max.append(current_year)

            max_y = max(potential_max)
            max_y = max(max_y, current_year)
            years = list(range(max_y, min_y - 1, -1))

        filter_options['years'] = years
        filter_options['current_year'] = current_year
        filter_options['engagement_types'] = ENGAGEMENT_TYPES

        return jsonify(filter_options), 200

    except Exception as exc:
        print(f"Education filter options error: {exc}")
        return jsonify({'message': 'Failed to fetch filter options.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@education_bp.route('/summary', methods=['GET'])
@token_optional
def get_summary(current_user_id):
    if not faculty_engagement_table_exists():
        return jsonify({
            'message': (
                "Faculty engagement table not found. Please apply the latest schema.sql "
                "so the education dashboards can load data."
            )
        }), 500

    year_str = request.args.get('year')
    filters = {
        'year': year_str,
        'department': request.args.get('department'),
        'engagement_type': request.args.get('engagement_type')
    }
    where_clause, params = build_filter_query(filters)
    rows, error = fetch_rows(where_clause, params)
    if error:
        return jsonify({'message': error}), 500

    summary_map, overall_active = compute_summary(rows, year_str)

    summary_list = [
        {
            'engagement_type': eng_type,
            'active': summary_map[eng_type]['active'],
        }
        for eng_type in ENGAGEMENT_TYPES
    ]

    return jsonify({
        'data': {
            'summary': summary_list,
            'overall_active': overall_active,
            'filters_applied': filters
        }
    }), 200


@education_bp.route('/department-breakdown', methods=['GET'])
@token_optional
def get_department_breakdown(current_user_id):
    if not faculty_engagement_table_exists():
        return jsonify({
            'message': (
                "Faculty engagement table not found. Please apply the latest schema.sql "
                "so the education dashboards can load data."
            )
        }), 500

    year_str = request.args.get('year')
    filters = {
        'year': year_str,
        'department': request.args.get('department'),
        'engagement_type': request.args.get('engagement_type')
    }
    where_clause, params = build_filter_query(filters)
    cutoff = get_cutoff_date(year_str)

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
                   SUM({active_sql()}) AS active
            FROM faculty_engagement
            {where_clause}
            GROUP BY department, std_type
            HAVING {get_standardized_type_sql()} IS NOT NULL
            ORDER BY department, std_type
            """,
            [cutoff.isoformat()] + list(params)
        )
        rows = cur.fetchall()

        breakdown_map = {}
        for row in rows:
            dept = row['department'] or 'Unknown'
            if dept not in breakdown_map:
                breakdown_map[dept] = {
                    'department': dept,
                    'details': {
                        eng_type: {'total': 0, 'active': 0}
                        for eng_type in ENGAGEMENT_TYPES
                    }
                }
            breakdown_map[dept]['details'][row['std_type']] = {
                'total': row['total'],
                'active': row['active']
            }

        formatted = []
        for dept, data in sorted(breakdown_map.items()):
            entry = {'department': dept}
            totals = actives = 0
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
        return jsonify({'message': "Faculty engagement table not found."}), 500
    except Exception as exc:
        print(f"Education department breakdown error: {exc}")
        return jsonify({'message': 'Failed to fetch department breakdown.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@education_bp.route('/year-trend', methods=['GET'])
@token_optional
def get_year_trend(current_user_id):
    if not faculty_engagement_table_exists():
        return jsonify({'message': "Faculty engagement table not found."}), 500

    filters = {
        'year': None,
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

        # Count engagements active as of Dec-31 of each year (today for current year)
        cur.execute(
            f"""
            WITH years AS (
                SELECT generate_series(
                    MIN(EXTRACT(YEAR FROM startdate))::int,
                    GREATEST(
                        MAX(EXTRACT(YEAR FROM COALESCE(enddate, CURRENT_DATE)))::int,
                        EXTRACT(YEAR FROM CURRENT_DATE)::int
                    )
                ) AS yr
                FROM faculty_engagement
            ),
            base AS (
                SELECT
                    {get_standardized_type_sql()} AS std_type,
                    startdate,
                    enddate
                FROM faculty_engagement
                {where_clause}
            )
            SELECT
                y.yr AS year,
                b.std_type,
                COUNT(*) AS active
            FROM years y
            JOIN base b ON
                b.std_type IS NOT NULL
                AND b.startdate <= CASE
                    WHEN y.yr >= EXTRACT(YEAR FROM CURRENT_DATE) THEN CURRENT_DATE
                    ELSE (y.yr || '-12-31')::date
                END
                AND (
                    b.enddate IS NULL
                    OR b.enddate >= CASE
                        WHEN y.yr >= EXTRACT(YEAR FROM CURRENT_DATE) THEN CURRENT_DATE
                        ELSE (y.yr || '-12-31')::date
                    END
                )
            GROUP BY y.yr, b.std_type
            ORDER BY y.yr ASC, b.std_type
            """,
            params
        )
        rows = cur.fetchall()

        trend_map = {}
        for row in rows:
            yr = row['year']
            if yr is None:
                continue
            if yr not in trend_map:
                trend_map[yr] = {eng_type: 0 for eng_type in ENGAGEMENT_TYPES}
                trend_map[yr]['year'] = yr
            trend_map[yr][row['std_type']] = row['active']

        trend_list = [trend_map[yr] for yr in sorted(trend_map.keys())]
        return jsonify({'data': trend_list}), 200
    except UndefinedTable:
        return jsonify({'message': "Faculty engagement table not found."}), 500
    except Exception as exc:
        print(f"Education year trend error: {exc}")
        return jsonify({'message': 'Failed to fetch year trend.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@education_bp.route('/type-distribution', methods=['GET'])
@token_optional
def get_type_distribution(current_user_id):
    if not faculty_engagement_table_exists():
        return jsonify({'message': "Faculty engagement table not found."}), 500

    year_str = request.args.get('year')
    filters = {
        'year': year_str,
        'department': request.args.get('department'),
        'engagement_type': request.args.get('engagement_type')
    }
    where_clause, params = build_filter_query(filters)
    cutoff = get_cutoff_date(year_str)

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()

        # Wrap in a subquery so we can GROUP BY the alias std_type
        cur.execute(
            f"""
            SELECT std_type,
                   COUNT(*) AS total,
                   SUM({active_sql()}) AS active
            FROM (
                SELECT {get_standardized_type_sql()} AS std_type,
                       enddate
                FROM faculty_engagement
                {where_clause}
            ) sub
            WHERE std_type IS NOT NULL
            GROUP BY std_type
            ORDER BY std_type
            """,
            [cutoff.isoformat()] + list(params)
        )
        rows = cur.fetchall()
        distribution = [
            {
                'engagement_type': row['std_type'],
                'total': row['total'],
                'active': row['active']
            }
            for row in rows
        ]
        return jsonify({'data': distribution}), 200
    except UndefinedTable:
        return jsonify({'message': "Faculty engagement table not found."}), 500
    except Exception as exc:
        print(f"Education type distribution error: {exc}")
        return jsonify({'message': 'Failed to fetch type distribution.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@education_bp.route('/list', methods=['GET'])
@token_optional
def get_faculty_engagement_list(current_user_id):
    if not faculty_engagement_table_exists():
        return jsonify({'message': "Faculty engagement table not found."}), 500

    year_str = request.args.get('year')
    filters = {
        'year': year_str,
        'department': request.args.get('department'),
        'engagement_type': request.args.get('engagement_type')
    }
    where_clause, params = build_filter_query(filters)
    cutoff = get_cutoff_date(year_str)

    active_condition = "(enddate IS NULL OR enddate >= %s::date)"
    if where_clause:
        active_where = where_clause + f" AND {active_condition}"
    else:
        active_where = f"WHERE {active_condition}"

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
            {active_where}
            ORDER BY year DESC, faculty_name ASC
            """,
            list(params) + [cutoff.isoformat()]
        )
        rows = cur.fetchall()

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
        return jsonify({'message': "Faculty engagement table not found."}), 500
    except Exception as exc:
        print(f"Education list error: {exc}")
        return jsonify({'message': 'Failed to fetch faculty engagement list.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)