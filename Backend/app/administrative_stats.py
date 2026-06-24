from flask import Blueprint, jsonify, request
from .db import get_db_connection, release_db_connection
from .auth import token_optional
import psycopg2.extras
from datetime import date

administrative_bp = Blueprint('administrative', __name__)


# ---------------------------------------------------------------------------
# Helper: build dynamic WHERE clause from filter dict
# ---------------------------------------------------------------------------

def build_filter_query(filters):
    """
    Builds a WHERE clause dynamically based on provided filters.
    All queries now target the flat ``employees`` table (no JOINs).
    Returns a tuple: (where_clause_string, parameter_list)
    """
    conditions = []
    params = []

    filter_mapping = {
        'department': 'department',
        'designation': 'designation',
        'gender': 'gender',
        'emp_type': 'emp_type',
        'empstatus': 'empstatus',
        'group_name': 'group_name',
        'appointed_category': 'appointed_category',
    }

    for filter_name, value in filters.items():
        if value is None or value == '' or value == 'All':
            continue

        column_name = filter_mapping.get(filter_name)
        if not column_name:
            continue

        # NULL emp_type is treated as Teaching (default)
        if column_name == 'emp_type' and value == 'Teaching':
            conditions.append("(emp_type = %s OR emp_type IS NULL)")
        else:
            conditions.append(f"{column_name} = %s")
        params.append(value)

    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    return where_clause, params


def _append_active_default(where_clause, params, empstatus_value):
    """If the caller hasn't explicitly set empstatus, default to Active."""
    if empstatus_value is not None and empstatus_value != '' and empstatus_value != 'All':
        return where_clause, params          # already filtered
    if where_clause:
        where_clause += " AND empstatus = %s"
    else:
        where_clause = "WHERE empstatus = %s"
    params.append('Active')
    return where_clause, params


def _append_emp_type(where_clause, params, employee_type):
    """Append emp_type condition (Teaching / Non Teaching) if given."""
    if employee_type and employee_type != 'All':
        if where_clause:
            where_clause += " AND emp_type = %s"
        else:
            where_clause = "WHERE emp_type = %s"
        params.append(employee_type)
    return where_clause, params


def _read_common_filters():
    """Read filter query‑params shared by most endpoints."""
    return {
        'department': request.args.get('department', type=str),
        'designation': request.args.get('designation', type=str),
        'gender': request.args.get('gender', type=str),
        'emp_type': request.args.get('emp_type', type=str),
        'empstatus': request.args.get('empstatus', type=str),
        'group_name': request.args.get('group_name', type=str),
        'appointed_category': request.args.get('appointed_category', type=str),
    }


# ======================================================================== #
#  ENDPOINTS                                                                #
# ======================================================================== #


_FILTER_COLUMN_MAP = {
    'department': 'department',
    'designation': 'designation',
    'gender': 'gender',
    'emp_type': 'emp_type',
    'empstatus': 'empstatus',
    'group_name': 'group_name',
    'appointed_category': 'appointed_category',
}


def _cascading_conditions(active_filters, exclude_field):
    """Build SQL conditions for all active filters except `exclude_field`.

    Used by the filter-options endpoint to compute distinct values for one
    dimension while keeping every other dimension's selection applied.
    Returns (list_of_condition_strings, list_of_params).
    """
    conditions = []
    params = []
    for filter_name, value in active_filters.items():
        if filter_name == exclude_field:
            continue
        if value is None or value == '' or value == 'All':
            continue
        column_name = _FILTER_COLUMN_MAP.get(filter_name)
        if not column_name:
            continue
        # Mirror build_filter_query: NULL emp_type is treated as Teaching
        if column_name == 'emp_type' and value == 'Teaching':
            conditions.append("(emp_type = %s OR emp_type IS NULL)")
        else:
            conditions.append(f"{column_name} = %s")
        params.append(value)
    return conditions, params


@administrative_bp.route('/stats/filter-options', methods=['GET'])
@token_optional
def get_filter_options(current_user_id):
    """
    Fetches distinct values for each filter field from the employees table.

    Cascading behaviour: when the request includes any of department,
    designation, gender, emp_type, empstatus, group_name, appointed_category
    as query parameters, every dimension's distinct list is computed by
    applying ALL OTHER active filters (each dimension excludes itself, so
    its own dropdown still shows the values reachable given the rest).

    If ?faculty_only=true, Department / Designation / Group are additionally
    scoped to active teaching faculty (emp_type='Teaching',
    designation!='Director', doj<=today, dor in future or null).
    """
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        faculty_only = request.args.get('faculty_only', '').lower() == 'true'
        active_filters = _read_common_filters()

        faculty_scope = (
            "emp_type = 'Teaching' AND designation != 'Director' "
            "AND doj <= CURRENT_DATE AND (dor IS NULL OR dor > CURRENT_DATE)"
        ) if faculty_only else None

        def distinct_values(column, exclude_field, extra_scope=None):
            base = [f"{column} IS NOT NULL"]
            if extra_scope:
                base.append(extra_scope)
            cond, params = _cascading_conditions(active_filters, exclude_field)
            where_clause = "WHERE " + " AND ".join(base + cond)
            cur.execute(
                f"SELECT DISTINCT {column} AS val FROM employees {where_clause} ORDER BY val;",
                params,
            )
            return [row['val'] for row in cur.fetchall()]

        filter_options = {
            'department': distinct_values('department', 'department', faculty_scope),
            'designation': distinct_values(
                'designation',
                'designation',
                "(designation != 'Director')" +
                (f" AND {faculty_scope}" if faculty_scope else "")
            ),
            'gender': distinct_values('gender', 'gender'),
            'emp_type': distinct_values('emp_type', 'emp_type'),
            'empstatus': distinct_values('empstatus', 'empstatus'),
            'group_name': distinct_values('group_name', 'group_name', faculty_scope),
            'appointed_category': distinct_values('appointed_category', 'appointed_category'),
        }

        # Years of Joining (doj) — NOT cascaded. Year is a per-chart filter
        # (regYearFD/YW/GR, summary card selectedYear) and shrinking this list
        # based on dimensional filters would silently invalidate the user's
        # current year selection and return empty chart data. Keep it stable.
        year_where = "WHERE doj IS NOT NULL"
        if faculty_scope:
            year_where += f" AND {faculty_scope}"
        cur.execute(
            f"SELECT DISTINCT EXTRACT(YEAR FROM doj)::int AS year FROM employees {year_where} ORDER BY year DESC;"
        )
        filter_options['years'] = [row['year'] for row in cur.fetchall()]

        return jsonify(filter_options), 200

    except Exception as e:
        print(f"Error fetching filter options: {e}")
        return jsonify({'message': 'An error occurred while fetching filter options.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@administrative_bp.route('/stats/employee-overview', methods=['GET'])
@token_optional
def get_employee_overview(current_user_id):
    """
    Department-wise breakdown by gender.
    Returns data suitable for a stacked bar chart.
    """
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        filters = _read_common_filters()
        employee_type = filters.pop('emp_type', None)

        where_clause, params = build_filter_query(filters)
        where_clause, params = _append_active_default(where_clause, params, filters.get('empstatus'))
        where_clause, params = _append_emp_type(where_clause, params, employee_type)

        query = f"""
            SELECT
                COALESCE(department, 'Unknown') AS department,
                gender,
                COUNT(*) AS count
            FROM employees
            {where_clause}
            GROUP BY department, gender
            ORDER BY department, gender;
        """

        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(query, params)
        results = cur.fetchall()

        # Organise into {dept: {Male: n, Female: n, ...}}
        department_data = {}
        for row in results:
            dept = row['department']
            gender = row['gender'] or 'Unknown'
            count = row['count']

            if dept not in department_data:
                department_data[dept] = {'Male': 0, 'Female': 0, 'Other': 0, 'Transgender': 0}

            if gender in ('Male', 'Female', 'Transgender'):
                department_data[dept][gender] = count
            else:
                department_data[dept]['Other'] += count

        data = [{'name': dept, **counts} for dept, counts in department_data.items()]
        total = sum(sum(d.values()) for d in department_data.values())

        return jsonify({
            'data': data,
            'total': total,
            'filters_applied': {k: v for k, v in filters.items() if v and v != 'All'}
        }), 200

    except Exception as e:
        import traceback
        print(f"Error fetching employee overview: {e}\n{traceback.format_exc()}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@administrative_bp.route('/stats/faculty-gender-last-five-years', methods=['GET'])
@token_optional
def get_faculty_gender_last_five_years(current_user_id):
    """
    Faculty (Teaching) gender distribution for the last five calendar years.
    An employee is counted for a year if their doj <= year-end AND (dor IS NULL OR dor >= year-start).
    """
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        current_year = date.today().year
        genders = ['Male', 'Female', 'Other', 'Transgender']

        year_labels = []
        for i in range(5, 0, -1):
            yr = current_year - i
            label = f"{yr}-{str((yr + 1) % 100).zfill(2)}"
            year_labels.append((yr, label))

        rows = []
        for year_start, label in year_labels:
            for gender in genders:
                cur.execute(
                    """
                    SELECT COUNT(*) AS count
                    FROM employees
                    WHERE doj <= make_date(%s, 12, 31)
                      AND (dor IS NULL OR dor >= make_date(%s, 1, 1))
                      AND gender = %s
                      AND emp_type = 'Teaching';
                    """,
                    (year_start, year_start, gender)
                )
                result = cur.fetchone()
                count = int(result['count']) if result and result.get('count') else 0
                rows.append({
                    'label': label,
                    'gender': gender,
                    'count': count
                })

        # Build per-year dict
        year_map = {}
        for row in rows:
            label = row['label']
            gender = row['gender']
            count = row['count']
            if label not in year_map:
                year_map[label] = {g: 0 for g in genders}
            if gender in genders:
                year_map[label][gender] = count

        labels = [label for _, label in year_labels]
        for _, label in year_labels:
            if label not in year_map:
                year_map[label] = {g: 0 for g in genders}

        data = []
        for label in labels:
            entry = {'year_label': label}
            entry.update(year_map[label])
            entry['total'] = sum(year_map[label].values())
            data.append(entry)

        return jsonify({'data': data}), 200

    except Exception as e:
        import traceback
        print(f"Error fetching faculty gender last five years: {e}\n{traceback.format_exc()}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@administrative_bp.route('/stats/faculty-by-department-designation', methods=['GET'])
@token_optional
def get_faculty_by_department_designation(current_user_id):
    """Department × designation breakdown."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        filters = _read_common_filters()
        employee_type = filters.pop('emp_type', None)

        where_clause, params = build_filter_query(filters)
        where_clause, params = _append_active_default(where_clause, params, filters.get('empstatus'))
        where_clause, params = _append_emp_type(where_clause, params, employee_type)

        query = f"""
            SELECT
                COALESCE(department, 'Unknown') AS department,
                COALESCE(designation, 'Unknown') AS designation,
                COUNT(*) AS count
            FROM employees
            {where_clause}
            GROUP BY department, designation
            ORDER BY department, designation;
        """

        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(query, params)
        results = cur.fetchall()

        department_data = {}
        for row in results:
            dept = row['department']
            desig = row['designation']
            count = row['count']
            if dept not in department_data:
                department_data[dept] = {}
            department_data[dept][desig] = count

        data = []
        for dept, designations in department_data.items():
            entry = {'name': dept}
            for desig, count in designations.items():
                entry[desig] = count
            data.append(entry)

        total = sum(sum(d.values()) for d in department_data.values())

        return jsonify({
            'data': data,
            'total': total,
            'filters_applied': {k: v for k, v in filters.items() if v and v != 'All'}
        }), 200

    except Exception as e:
        import traceback
        print(f"Error fetching faculty by department: {e}\n{traceback.format_exc()}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@administrative_bp.route('/stats/staff-count', methods=['GET'])
@token_optional
def get_staff_count(current_user_id):
    """
    Staff count grouped by emp_type (Teaching / Non Teaching).
    """
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        filters = _read_common_filters()
        # Don't pop emp_type here — we want to allow filtering
        where_clause, params = build_filter_query(filters)
        where_clause, params = _append_active_default(where_clause, params, filters.get('empstatus'))

        query = f"""
            SELECT
                COALESCE(emp_type, 'Unknown') AS emp_type,
                COUNT(*) AS count
            FROM employees
            {where_clause}
            GROUP BY emp_type
            ORDER BY emp_type;
        """

        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(query, params)
        results = cur.fetchall()

        staff_data = {}
        for row in results:
            staff_data[row['emp_type']] = row['count']

        total = sum(staff_data.values())

        return jsonify({
            'data': staff_data,
            'total': total,
            'filters_applied': {k: v for k, v in filters.items() if v and v != 'All'}
        }), 200

    except Exception as e:
        import traceback
        print(f"Error fetching staff count: {e}\n{traceback.format_exc()}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@administrative_bp.route('/stats/gender-distribution', methods=['GET'])
@token_optional
def get_gender_distribution(current_user_id):
    """Gender-wise distribution for employees who joined in the current year."""
    conn = None
    cur = None
    try:
        from datetime import datetime

        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        filters = _read_common_filters()
        employee_type = filters.pop('emp_type', None)
        filters.pop('empstatus', None)

        # ✅ ADD: default year
        selected_year = request.args.get('year', type=int) or datetime.now().year

        where_clause, params = build_filter_query(filters)

        # ✅ ADD: year-based condition
        date_condition = """
            doj <= make_date(%s, 12, 31)
            AND (dor IS NULL OR dor >= make_date(%s, 12, 31))
        """
        # date_condition is APPENDED to where_clause below, so its %s
        # placeholders come AFTER the filter %s. Append year params to match.
        if where_clause:
            where_clause += f" AND {date_condition}"
        else:
            where_clause = f"WHERE {date_condition}"
        params = params + [selected_year, selected_year]

        where_clause, params = _append_emp_type(where_clause, params, employee_type)

        # keep this exactly
        where_clause += " AND COALESCE(designation, '') != 'Director'"

        query = f"""
            SELECT gender, COUNT(*) AS count
            FROM employees
            {where_clause}
            GROUP BY gender
            ORDER BY gender;
        """

        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(query, params)
        results = cur.fetchall()

        gender_data = {'Male': 0, 'Female': 0, 'Other': 0, 'Transgender': 0}
        for row in results:
            g = row['gender']
            if g in gender_data:
                gender_data[g] = row['count']
            else:
                gender_data[g] = row['count']

        total = sum(gender_data.values())

        return jsonify({
            'data': gender_data,
            'total': total,
            'employee_type': employee_type or 'All',
            'filters_applied': {k: v for k, v in filters.items() if v and v != 'All'}
        }), 200

    except Exception as e:
        import traceback
        print(f"Error fetching gender distribution: {e}\n{traceback.format_exc()}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@administrative_bp.route('/stats/category-distribution', methods=['GET'])
@token_optional
def get_category_distribution(current_user_id):

    conn = None
    cur = None
    try:
        from datetime import datetime

        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        filters = _read_common_filters()
        employee_type = filters.pop('emp_type', None)

        # ✅ ADD: default year
        selected_year = request.args.get('year', type=int) or datetime.now().year

        where_clause, params = build_filter_query(filters)

        # ✅ ADD: year-based condition (instead of only active)
        date_condition = """
            doj <= make_date(%s, 12, 31)
            AND (dor IS NULL OR dor >= make_date(%s, 12, 31))
        """
        # date_condition is APPENDED to where_clause below, so its %s
        # placeholders come AFTER the filter %s. Append year params to match.
        if where_clause:
            where_clause += f" AND {date_condition}"
        else:
            where_clause = f"WHERE {date_condition}"
        params = params + [selected_year, selected_year]

        # ⛔ KEEP ORIGINAL FUNCTION
        where_clause, params = _append_emp_type(where_clause, params, employee_type)

        query = f"""
            SELECT
                COALESCE(group_name, 'Not Specified') AS group_name,
                COUNT(*) AS count
            FROM employees
            {where_clause}
            GROUP BY group_name
            ORDER BY group_name;
        """

        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(query, params)
        results = cur.fetchall()

        group_data = {}
        for row in results:
            group_data[row['group_name']] = row['count']

        total = sum(group_data.values())

        return jsonify({
            'data': group_data,
            'total': total,
            'employee_type': employee_type or 'All',
            'filters_applied': {k: v for k, v in filters.items() if v and v != 'All'}
        }), 200

    except Exception as e:
        import traceback
        print(f"Error fetching group distribution: {e}\n{traceback.format_exc()}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@administrative_bp.route('/stats/data-summary', methods=['GET'])
@token_optional
def get_data_summary(current_user_id):
    """Diagnostic endpoint — quick stats from the employees table."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        summary = {}

        # Total employees
        cur.execute("SELECT COUNT(*) AS total FROM employees;")
        summary['total_employees'] = cur.fetchone()['total']

        # Active vs Relieved
        cur.execute("SELECT empstatus, COUNT(*) AS count FROM employees GROUP BY empstatus;")
        summary['status_distribution'] = {row['empstatus'] or 'Unknown': row['count'] for row in cur.fetchall()}

        # Gender distribution
        cur.execute("SELECT gender, COUNT(*) AS count FROM employees GROUP BY gender ORDER BY gender;")
        summary['gender_distribution'] = {row['gender'] or 'Unknown': row['count'] for row in cur.fetchall()}

        # Employee type distribution
        cur.execute("SELECT emp_type, COUNT(*) AS count FROM employees GROUP BY emp_type;")
        summary['employee_type_distribution'] = {row['emp_type'] or 'Unknown': row['count'] for row in cur.fetchall()}

        # Top departments
        cur.execute("""
            SELECT COALESCE(department, 'Unknown') AS dept, COUNT(*) AS count
            FROM employees
            GROUP BY department
            ORDER BY count DESC
            LIMIT 10;
        """)
        summary['top_departments'] = {row['dept']: row['count'] for row in cur.fetchall()}

        # Sample designations
        cur.execute("SELECT DISTINCT designation FROM employees WHERE designation IS NOT NULL LIMIT 10;")
        summary['sample_designations'] = [row['designation'] for row in cur.fetchall()]

        return jsonify(summary), 200

    except Exception as e:
        import traceback
        print(f"Error fetching data summary: {e}\n{traceback.format_exc()}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@administrative_bp.route('/stats/department-breakdown', methods=['GET'])
@token_optional
def get_department_breakdown(current_user_id):
    """Department-wise breakdown with gender and employee type."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        filters = _read_common_filters()
        employee_type = filters.pop('emp_type', None)

        where_clause, params = build_filter_query(filters)
        where_clause, params = _append_active_default(where_clause, params, filters.get('empstatus'))
        where_clause, params = _append_emp_type(where_clause, params, employee_type)

        query = f"""
            SELECT
                COALESCE(department, 'Unknown') AS department,
                gender,
                COALESCE(emp_type, 'Unknown') AS employee_type,
                COUNT(*) AS count
            FROM employees
            {where_clause}
            GROUP BY department, gender, emp_type
            ORDER BY department, gender, emp_type;
        """

        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(query, params)
        results = cur.fetchall()

        department_data = {}
        for row in results:
            dept = row['department']
            gender = row['gender'] or 'Unknown'
            emp_type = row['employee_type']
            count = row['count']

            if dept not in department_data:
                department_data[dept] = {
                    'Teaching_Male': 0, 'Teaching_Female': 0,
                    'Teaching_Other': 0, 'Teaching_Transgender': 0,
                    'Non Teaching_Male': 0, 'Non Teaching_Female': 0,
                    'Non Teaching_Other': 0, 'Non Teaching_Transgender': 0,
                }

            key = f"{emp_type}_{gender}"
            if key not in department_data[dept]:
                department_data[dept][key] = 0
            department_data[dept][key] = count

        data = [{'name': dept, **counts} for dept, counts in department_data.items()]
        total = sum(sum(d.values()) for d in department_data.values())

        return jsonify({
            'data': data,
            'total': total,
            'filters_applied': {k: v for k, v in filters.items() if v and v != 'All'}
        }), 200

    except Exception as e:
        import traceback
        print(f"Error fetching department breakdown: {e}\n{traceback.format_exc()}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@administrative_bp.route('/stats/yearwise-strength', methods=['GET'])
@token_optional
def get_yearwise_strength(current_user_id):
    """
    Active employee headcount for each calendar year.

    An employee is counted for year Y if:
      doj <= Y-12-31  AND  (dor IS NULL OR dor >= Y-12-31)

    Teaching    : emp_type = 'Teaching', designation != 'Director'
    NonTeaching : emp_type = 'Non Teaching'
    All         : union of the two above (i.e. excluding Research and Director)

    Note: emp_type values in DB are 'Teaching' / 'NonTeaching' / 'Research'.
    'Non Teaching' (with a space) is accepted as a backward-compat alias.
    The previous `employmentnature = 'Regular'` filter has been dropped — DB
    values are Contract/Permanent/Temporary; "Regular" doesn't exist there.
    Non-regular faculty live in the separate `faculty_engagement` table.
    """
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        emp_type           = request.args.get('emp_type',           type=str)
        department         = request.args.get('department',         type=str)
        designation        = request.args.get('designation',        type=str)
        gender             = request.args.get('gender',             type=str)
        group_name         = request.args.get('group_name',         type=str)
        appointed_category = request.args.get('appointed_category', type=str)
        num_years          = request.args.get('num_years',          type=int) or 5

        # ✅ ADD THIS
        selected_year      = request.args.get('year', type=int)

        # emp_type literals in the DB are 'Teaching' and 'NonTeaching'
        # (no space). Accept 'Non Teaching' as a backward-compat alias.
        if emp_type == 'Teaching':
            emp_filter = (
                "e.emp_type = 'Teaching' "
                "AND e.designation != 'Director'"
            )
        elif emp_type in ('NonTeaching', 'Non Teaching'):
            emp_filter = "e.emp_type = 'Non Teaching'"
        else:
            emp_filter = (
                "("
                "  (e.emp_type = 'Teaching' AND e.designation != 'Director') "
                "  OR e.emp_type = 'Non Teaching'"
                ")"
            )

        # Filters
        extra_conditions, filter_params = [], []
        if department:
            extra_conditions.append("e.department = %s")
            filter_params.append(department)
        if designation:
            extra_conditions.append("e.designation = %s")
            filter_params.append(designation)
        if gender:
            extra_conditions.append("e.gender = %s")
            filter_params.append(gender)
        if group_name:
            extra_conditions.append("e.group_name = %s")
            filter_params.append(group_name)
        if appointed_category:
            extra_conditions.append("e.appointed_category = %s")
            filter_params.append(appointed_category)

        full_filter = emp_filter
        if extra_conditions:
            full_filter += " AND " + " AND ".join(extra_conditions)

        # ✅ UPDATED PARAMS
        query_params = [
            selected_year, selected_year,   # start
            num_years,
            selected_year, selected_year    # end
        ] + filter_params

        # ✅ UPDATED QUERY (ONLY generate_series modified)
        query = f"""
            SELECT
                y.yr                                                    AS year,
                COUNT(e.id)                                             AS total,
                COUNT(e.id) FILTER (WHERE e.gender = 'Male')            AS male,
                COUNT(e.id) FILTER (WHERE e.gender = 'Female')          AS female,
                COUNT(e.id) FILTER (WHERE e.gender NOT IN ('Male','Female') AND e.gender IS NOT NULL) AS other
            FROM (
                SELECT generate_series(
                    CASE 
                        WHEN %s IS NOT NULL THEN %s
                        ELSE GREATEST(
                            (SELECT EXTRACT(YEAR FROM MIN(doj))::int
                             FROM employees WHERE doj IS NOT NULL),
                            EXTRACT(YEAR FROM CURRENT_DATE)::int - %s + 1
                        )
                    END,
                    CASE 
                        WHEN %s IS NOT NULL THEN %s
                        ELSE EXTRACT(YEAR FROM CURRENT_DATE)::int
                    END
                ) AS yr
            ) y
            LEFT JOIN employees e
                ON  e.doj <= make_date(y.yr::int, 12, 31)
                AND (e.dor IS NULL OR e.dor >= make_date(y.yr::int, 12, 31))
                AND {full_filter}
            GROUP BY y.yr
            ORDER BY y.yr;
        """

        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(query, query_params)
        results = cur.fetchall()

        data = [
            {
                'year':   str(row['year']),
                'Total':  int(row['total'] or 0),
                'Male':   int(row['male']  or 0),
                'Female': int(row['female'] or 0),
                'Other':  int(row['other']  or 0),
            }
            for row in results
        ]

        current_total = data[-1]['Total'] if data else 0

        return jsonify({'data': data, 'total': current_total}), 200

    except Exception as e:
        import traceback
        print(f"Error fetching yearwise strength: {e}\n{traceback.format_exc()}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@administrative_bp.route('/stats/faculty-expertise-matrix', methods=['GET'])
@token_optional
def get_faculty_expertise_matrix(current_user_id):

    conn = None
    cur = None
    try:
        from datetime import datetime

        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        department         = request.args.get('department',         type=str)
        designation        = request.args.get('designation',        type=str)
        gender             = request.args.get('gender',             type=str)
        group_name         = request.args.get('group_name',         type=str)
        appointed_category = request.args.get('appointed_category', type=str)

        # ✅ Default to current year
        selected_year = request.args.get('year', type=int) or datetime.now().year

        extra_conditions = []
        params = []

        if department:
            extra_conditions.append("department = %s")
            params.append(department)
        if designation:
            extra_conditions.append("designation = %s")
            params.append(designation)
        if gender:
            extra_conditions.append("gender = %s")
            params.append(gender)
        if group_name:
            extra_conditions.append("group_name = %s")
            params.append(group_name)
        if appointed_category:
            extra_conditions.append("appointed_category = %s")
            params.append(appointed_category)

        extra_sql = ""
        if extra_conditions:
            extra_sql = " AND " + " AND ".join(extra_conditions)

        # ✅ Year-based on-roll logic (always applied)
        date_condition = """
            doj <= make_date(%s, 12, 31)
            AND (dor IS NULL OR dor >= make_date(%s, 12, 31))
        """
        params = [selected_year, selected_year] + params

        query = f"""
            SELECT
                COALESCE(department, 'Unknown') AS department,
                COUNT(*) AS count
            FROM employees
            WHERE emp_type = 'Teaching'
              AND designation != 'Director'
              AND {date_condition}
              {extra_sql}
            GROUP BY department
            ORDER BY count DESC, department;
        """

        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(query, params)
        results = cur.fetchall()

        data = [{'name': row['department'], 'count': int(row['count'])} for row in results]
        total = sum(d['count'] for d in data)

        return jsonify({'data': data, 'total': total}), 200

    except Exception as e:
        import traceback
        print(f"Error fetching faculty expertise matrix: {e}\n{traceback.format_exc()}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)