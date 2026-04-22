from flask import Blueprint, jsonify, request

from .auth import token_required
from .db import get_db_connection, release_db_connection

iar_bp = Blueprint('iar', __name__)


# ---------------------------------------------------------------------------
# New alumni table columns:
#   sl_no (PK), roll_number, year_of_admission, year_of_graduation,
#   course_type, course_name, department, current_job,
#   country_of_settlement, place_of_settlement_state, alumni_contribution
#
# Removed columns (no longer available):
#   name, alumniidno, gender, category, outcome, homestate, jobstate,
#   jobplace, employer_or_institution, updated_at
# ---------------------------------------------------------------------------


def build_filter_query(filters):
    """Build a WHERE clause from the filter dict."""
    conditions = []
    params = []

    mapping = {
        'year': 'a.year_of_graduation',
        'department': 'a.department',
        'course_type': 'a.course_type',
    }

    for key, column in mapping.items():
        value = filters.get(key)
        if value is None or value == '' or value == 'All':
            continue
        conditions.append(f"{column} = %s")
        params.append(value)

    where_clause = ''
    if conditions:
        where_clause = 'WHERE ' + ' AND '.join(conditions)
    return where_clause, params


def apply_filters_and_fetch(where_clause, params,
                            order_clause='ORDER BY a.year_of_graduation ASC'):
    """Run a SELECT on the alumni table with the given filters."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return None, 'Database connection failed.'

        cur = conn.cursor()
        query = f"""
            SELECT
                a.sl_no,
                a.roll_number,
                a.year_of_admission,
                a.year_of_graduation,
                a.course_type,
                a.course_name,
                a.department,
                a.current_job,
                a.country_of_settlement,
                a.place_of_settlement_state,
                a.alumni_contribution
            FROM alumni a
            {where_clause}
            {order_clause}
        """
        cur.execute(query, params)
        rows = cur.fetchall()
        return rows, None
    except Exception as exc:
        print(f"IAR stats error: {exc}")
        return None, 'Failed to fetch alumni data.'
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


def classify_outcome(row):
    """
    Attempt to classify an alumnus's outcome from the `current_job` field.
    If the job title hints at academia/research → HigherStudies, else Corporate.
    """
    job = (row.get('current_job') or '').lower()
    academic_keywords = (
        'research', 'phd', 'ms ', 'msc', 'fellow', 'scholar',
        'professor', 'lecturer', 'postdoc', 'university', 'institute',
        'college', 'academia', 'doctoral',
    )
    if any(kw in job for kw in academic_keywords):
        return 'HigherStudies'
    return 'Corporate'


@iar_bp.route('/filter-options', methods=['GET'])
@token_required
def get_filter_options(current_user_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500

        cur = conn.cursor()
        cur.execute("""
            SELECT
                ARRAY(SELECT DISTINCT year_of_graduation FROM alumni
                      WHERE year_of_graduation IS NOT NULL
                      ORDER BY year_of_graduation DESC) AS years,
                ARRAY(SELECT DISTINCT department FROM alumni
                      WHERE department IS NOT NULL AND department != ''
                      ORDER BY department) AS departments,
                ARRAY(SELECT DISTINCT course_type FROM alumni
                      WHERE course_type IS NOT NULL
                      ORDER BY course_type) AS course_types
        """)
        row = cur.fetchone()
        return jsonify({
            'years': row['years'] if row and row.get('years') else [],
            'departments': row['departments'] if row and row.get('departments') else [],
            'course_types': row['course_types'] if row and row.get('course_types') else [],
        }), 200
    except Exception as exc:
        print(f"IAR filter options error: {exc}")
        return jsonify({'message': 'Failed to fetch filter options.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@iar_bp.route('/summary', methods=['GET'])
@token_required
def get_summary(current_user_id):
    filters = {
        'year': request.args.get('year'),
        'department': request.args.get('department'),
        'course_type': request.args.get('course_type'),
    }

    where_clause, params = build_filter_query(filters)
    rows, error = apply_filters_and_fetch(where_clause, params)
    if error:
        return jsonify({'message': error}), 500

    total_alumni = len(rows)
    higher_studies = sum(1 for r in rows if classify_outcome(r) == 'HigherStudies')
    corporate = total_alumni - higher_studies

    by_year = {}
    for row in rows:
        year = row.get('year_of_graduation')
        if year is None:
            continue
        if year not in by_year:
            by_year[year] = {'total': 0, 'higher': 0, 'corporate': 0}
        by_year[year]['total'] += 1
        if classify_outcome(row) == 'HigherStudies':
            by_year[year]['higher'] += 1
        else:
            by_year[year]['corporate'] += 1

    trend = [
        {'year': year, **counts}
        for year, counts in sorted(by_year.items())
    ]

    return jsonify({
        'data': {
            'total_alumni': total_alumni,
            'higher_studies': higher_studies,
            'corporate': corporate,
            'trend': trend,
        }
    }), 200


@iar_bp.route('/state-distribution', methods=['GET'])
@token_required
def get_state_distribution(current_user_id):
    filters = {
        'year': request.args.get('year'),
        'department': request.args.get('department'),
        'course_type': request.args.get('course_type'),
    }

    where_clause, params = build_filter_query(filters)
    rows, error = apply_filters_and_fetch(where_clause, params)
    if error:
        return jsonify({'message': error}), 500

    distribution = {}
    for row in rows:
        state = row.get('place_of_settlement_state') or 'Unknown'
        distribution[state] = distribution.get(state, 0) + 1

    formatted = [
        {'state': s, 'count': c}
        for s, c in sorted(distribution.items())
    ]
    return jsonify({'data': formatted}), 200


@iar_bp.route('/country-distribution', methods=['GET'])
@token_required
def get_country_distribution(current_user_id):
    filters = {
        'year': request.args.get('year'),
        'department': request.args.get('department'),
        'course_type': request.args.get('course_type'),
    }

    where_clause, params = build_filter_query(filters)
    rows, error = apply_filters_and_fetch(where_clause, params)
    if error:
        return jsonify({'message': error}), 500

    distribution = {}
    for row in rows:
        country = row.get('country_of_settlement') or 'Unknown'
        distribution[country] = distribution.get(country, 0) + 1

    formatted = [
        {'country': c, 'count': n}
        for c, n in sorted(distribution.items(), key=lambda x: (-x[1], x[0]))
    ]
    return jsonify({'data': formatted}), 200


@iar_bp.route('/outcome-breakdown', methods=['GET'])
@token_required
def get_outcome_breakdown(current_user_id):
    """Per-department counts for higher studies vs corporate (inferred from current_job)."""
    filters = {
        'year': request.args.get('year'),
        'department': request.args.get('department'),
        'course_type': request.args.get('course_type'),
    }

    where_clause, params = build_filter_query(filters)
    rows, error = apply_filters_and_fetch(where_clause, params)
    if error:
        return jsonify({'message': error}), 500

    breakdown = {}
    for row in rows:
        dept = row.get('department') or 'Unknown'
        if dept not in breakdown:
            breakdown[dept] = {'department': dept, 'higher': 0, 'corporate': 0, 'total': 0}
        breakdown[dept]['total'] += 1
        if classify_outcome(row) == 'HigherStudies':
            breakdown[dept]['higher'] += 1
        else:
            breakdown[dept]['corporate'] += 1

    formatted = sorted(breakdown.values(), key=lambda x: x['department'])
    return jsonify({'data': formatted}), 200


# ---------------------------------------------------------------------------
# IAR MOUs
# ---------------------------------------------------------------------------

@iar_bp.route('/mous/filter-options', methods=['GET'])
@token_required
def get_mou_filter_options(current_user_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        cur = conn.cursor()
        cur.execute("""
            SELECT DISTINCT EXTRACT(YEAR FROM date_signed) as year
            FROM iar_mous
            WHERE date_signed IS NOT NULL
            ORDER BY year DESC
        """)
        years = [str(int(row['year'])) for row in cur.fetchall()]
        return jsonify({'mou_years': years}), 200
    except Exception as e:
        print(f"IAR MoU filter options error: {e}")
        return jsonify({'message': 'Failed to fetch MoU filter options'}), 500
    finally:
        if cur: cur.close()
        if conn: release_db_connection(conn)


@iar_bp.route('/mous/trend', methods=['GET'])
@token_required
def get_mou_trend(current_user_id):
    mou_year = request.args.get('mou_year')
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        cur = conn.cursor()
        
        query = "SELECT EXTRACT(YEAR FROM date_signed) as year, COUNT(*) as total FROM iar_mous WHERE date_signed IS NOT NULL"
        params = []
        if mou_year and mou_year != 'All':
            query += " AND EXTRACT(YEAR FROM date_signed) = %s"
            params.append(mou_year)
        query += " GROUP BY year ORDER BY year ASC"
        
        cur.execute(query, params)
        trend = [{'year': str(int(row['year'])), 'total': row['total']} for row in cur.fetchall()]
        return jsonify({'data': trend}), 200
    except Exception as e:
        print(f"IAR MoU trend error: {e}")
        return jsonify({'message': 'Failed to fetch MoU trend'}), 500
    finally:
        if cur: cur.close()
        if conn: release_db_connection(conn)


@iar_bp.route('/mous/list', methods=['GET'])
@token_required
def get_mou_list(current_user_id):
    mou_year = request.args.get('mou_year')
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed'}), 500
        cur = conn.cursor()
        
        query = "SELECT * FROM iar_mous"
        params = []
        if mou_year and mou_year != 'All':
            query += " WHERE EXTRACT(YEAR FROM date_signed) = %s"
            params.append(mou_year)
        query += " ORDER BY date_signed DESC NULLS LAST"
        
        cur.execute(query, params)
        rows = [dict(row) for row in cur.fetchall()]
        for r in rows:
            if r.get('date_signed'):
                r['date_signed'] = r['date_signed'].isoformat()
            if r.get('validity_end'):
                r['validity_end'] = r['validity_end'].isoformat()
                
        return jsonify({'data': rows}), 200
    except Exception as e:
        print(f"IAR MoU list error: {e}")
        return jsonify({'message': 'Failed to fetch MoU records'}), 500
    finally:
        if cur: cur.close()
        if conn: release_db_connection(conn)
