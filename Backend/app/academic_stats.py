from flask import Blueprint, jsonify, request
from .db import get_db_connection, release_db_connection
from .auth import token_optional

academic_bp = Blueprint('academic', __name__)

# New table name (was 'student')
STUDENT_TABLE = 'student_table'


def get_latest_year():
    """Returns the maximum admission_year from the student_table."""
    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return None

        cur = conn.cursor()
        cur.execute(f"SELECT MAX(admission_year) as latest_year FROM {STUDENT_TABLE};")
        result = cur.fetchone()

        if result and result['latest_year']:
            return result['latest_year']
        return None
    except Exception as e:
        print(f"Error getting latest year: {e}")
        return None
    finally:
        if conn:
            cur.close()
            release_db_connection(conn)


def build_filter_query(filters):
    """
    Builds a WHERE clause dynamically based on provided filters.
    Returns a tuple: (where_clause_string, parameter_list)
    """
    conditions = []
    params = []

    # Map frontend filter names to new database column names
    filter_mapping = {
        'yearofadmission': 'admission_year',
        'program': 'programme_current',
        'batch': 'admission_batch',
        'branch': 'stream_current',
        'department': 'department_current',
        'category': 'original_category',
        'gender': 'gender',
        'state': 'state',
        'pwd': 'pwd_status'
    }

    for filter_name, value in filters.items():
        if value is None or value == '' or value == 'All':
            continue

        column_name = filter_mapping.get(filter_name)
        if not column_name:
            continue

        # Handle PWD filter — pwd_status is a varchar ('Yes'/'No') not a boolean.
        # Blank/NULL entries are treated as 'No'.
        if filter_name == 'pwd':
            is_yes = (value is True) or (value == 'true')
            if is_yes:
                conditions.append(f"UPPER(COALESCE({column_name}, '')) = 'YES'")
            else:
                # 'No' includes explicit 'No' values AND blank/NULL entries
                conditions.append(f"UPPER(COALESCE({column_name}, '')) != 'YES'")
        else:
            conditions.append(f"{column_name} = %s")
            params.append(value)

    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    return where_clause, params


@academic_bp.route('/stats/filter-options', methods=['GET'])
@token_optional
def get_filter_options(current_user_id):
    """Fetches distinct values for each filter field."""
    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        cur = conn.cursor()

        filter_options = {}

        # Year of Admission (admission_year)
        cur.execute(f"SELECT DISTINCT admission_year FROM {STUDENT_TABLE} WHERE admission_year IS NOT NULL ORDER BY admission_year DESC;")
        filter_options['yearofadmission'] = [row['admission_year'] for row in cur.fetchall()]

        # Program (programme_current)
        cur.execute(f"SELECT DISTINCT programme_current FROM {STUDENT_TABLE} WHERE programme_current IS NOT NULL ORDER BY programme_current;")
        filter_options['program'] = [row['programme_current'] for row in cur.fetchall()]

        # Batch (admission_batch)
        cur.execute(f"SELECT DISTINCT admission_batch FROM {STUDENT_TABLE} WHERE admission_batch IS NOT NULL ORDER BY admission_batch;")
        filter_options['batch'] = [row['admission_batch'] for row in cur.fetchall()]

        # Branch (stream_current)
        cur.execute(f"SELECT DISTINCT stream_current FROM {STUDENT_TABLE} WHERE stream_current IS NOT NULL ORDER BY stream_current;")
        filter_options['branch'] = [row['stream_current'] for row in cur.fetchall()]

        # Department (department_current)
        cur.execute(f"SELECT DISTINCT department_current FROM {STUDENT_TABLE} WHERE department_current IS NOT NULL ORDER BY department_current;")
        filter_options['department'] = [row['department_current'] for row in cur.fetchall()]

        # Category (original_category)
        cur.execute(f"SELECT DISTINCT original_category FROM {STUDENT_TABLE} WHERE original_category IS NOT NULL ORDER BY original_category;")
        filter_options['category'] = [row['original_category'] for row in cur.fetchall()]

        # State
        cur.execute(f"SELECT DISTINCT state FROM {STUDENT_TABLE} WHERE state IS NOT NULL ORDER BY state;")
        filter_options['state'] = [row['state'] for row in cur.fetchall()]

        # Get latest year
        latest_year = get_latest_year()
        filter_options['latest_year'] = latest_year

        return jsonify(filter_options), 200

    except Exception as e:
        print(f"Error fetching filter options: {e}")
        return jsonify({'message': 'An error occurred while fetching filter options.'}), 500
    finally:
        if conn:
            cur.close()
            release_db_connection(conn)


@academic_bp.route('/stats/gender-distribution-filtered', methods=['GET'])
@token_optional
def get_gender_distribution_filtered(current_user_id):
    """Fetches gender distribution based on provided filters."""
    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        yearofadmission_param = request.args.get('yearofadmission', type=str)

        filters = {
            'yearofadmission': None,
            'program': request.args.get('program', type=str),
            'batch': request.args.get('batch', type=str),
            'branch': request.args.get('branch', type=str),
            'department': request.args.get('department', type=str),
            'category': request.args.get('category', type=str),
            'pwd': request.args.get('pwd', type=str)
        }

        if yearofadmission_param == 'All':
            filters['yearofadmission'] = 'All'
        elif yearofadmission_param:
            filters['yearofadmission'] = yearofadmission_param

        # Convert PWD string to boolean if provided
        if filters['pwd'] == 'true':
            filters['pwd'] = True
        elif filters['pwd'] == 'false':
            filters['pwd'] = False
        elif filters['pwd'] == '' or filters['pwd'] is None:
            filters['pwd'] = None

        if filters['yearofadmission'] is None:
            latest_year = get_latest_year()
            if latest_year:
                filters['yearofadmission'] = latest_year

        where_clause, params = build_filter_query(filters)

        query = f"""
            SELECT gender, COUNT(*) as count
            FROM {STUDENT_TABLE}
            {where_clause}
            GROUP BY gender
            ORDER BY gender;
        """

        cur = conn.cursor()
        cur.execute(query, params)
        results = cur.fetchall()

        gender_data = {
            'Male': 0,
            'Female': 0,
            'Transgender': 0
        }

        for row in results:
            gender = row['gender']
            if gender in gender_data:
                gender_data[gender] = row['count']

        total = sum(gender_data.values())

        filters_applied = {
            k: v for k, v in filters.items()
            if v is not None and v != '' and v != 'All'
        }

        return jsonify({
            'data': gender_data,
            'total': total,
            'filters_applied': filters_applied
        }), 200

    except Exception as e:
        print(f"Error fetching gender distribution: {e}")
        return jsonify({'message': 'An error occurred while fetching gender distribution.'}), 500
    finally:
        if conn:
            cur.close()
            release_db_connection(conn)


@academic_bp.route('/stats/state-distribution', methods=['GET'])
@token_optional
def get_state_distribution(current_user_id):
    """Fetches student state distribution based on provided filters."""
    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        filters = {
            'yearofadmission': request.args.get('yearofadmission', type=str),
            'program': request.args.get('program', type=str),
            'batch': request.args.get('batch', type=str),
            'department': request.args.get('department', type=str),
            'gender': request.args.get('gender', type=str),
            'state': request.args.get('state', type=str),
        }
        


        where_clause, params = build_filter_query(filters)

        if where_clause:
            query = f"""
                SELECT state, COUNT(*) as count
                FROM {STUDENT_TABLE}
                {where_clause} AND state IS NOT NULL AND TRIM(state) != ''
                GROUP BY state
                ORDER BY count DESC;
            """
        else:
            query = f"""
                SELECT state, COUNT(*) as count
                FROM {STUDENT_TABLE}
                WHERE state IS NOT NULL AND TRIM(state) != ''
                GROUP BY state
                ORDER BY count DESC;
            """

        cur = conn.cursor()
        cur.execute(query, params)
        results = cur.fetchall()

        data = []
        for row in results:
            data.append({
                'state': row['state'],
                'count': row['count']
            })

        return jsonify({'data': data}), 200

    except Exception as e:
        print(f"Error fetching state distribution: {e}")
        return jsonify({'message': 'An error occurred while fetching state distribution.'}), 500
    finally:
        if conn:
            cur.close()
            release_db_connection(conn)


@academic_bp.route('/stats/student-strength', methods=['GET'])
@token_optional
def get_student_strength(current_user_id):
    """Fetches student strength grouped by program with gender breakdown."""
    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        yearofadmission_param = request.args.get('yearofadmission', type=str)

        filters = {
            'yearofadmission': None,
            'category': request.args.get('category', type=str),
            'state': request.args.get('state', type=str)
        }

        if yearofadmission_param == 'All':
            filters['yearofadmission'] = 'All'
        elif yearofadmission_param:
            filters['yearofadmission'] = yearofadmission_param

        if filters['yearofadmission'] is None:
            latest_year = get_latest_year()
            if latest_year:
                filters['yearofadmission'] = latest_year
            else:
                return jsonify({'message': 'No admission year data available.'}), 400

        if filters['yearofadmission'] is None:
            return jsonify({'message': 'yearofadmission is required.'}), 400

        where_clause, params = build_filter_query(filters)

        # Use programme_current but alias as 'name' for frontend compatibility
        query = f"""
            SELECT programme_current as name, gender, COUNT(*) as count
            FROM {STUDENT_TABLE}
            {where_clause}
            GROUP BY programme_current, gender
            ORDER BY programme_current, gender;
        """

        cur = conn.cursor()
        cur.execute(query, params)
        results = cur.fetchall()

        program_data = {}
        for row in results:
            program = row['name']
            gender = row['gender']
            count = row['count']

            if program not in program_data:
                program_data[program] = {
                    'name': program,
                    'Male': 0,
                    'Female': 0,
                    'Transgender': 0
                }

            if gender in program_data[program]:
                program_data[program][gender] = count

        data = list(program_data.values())
        total = sum(row['Male'] + row['Female'] + row['Transgender'] for row in data)

        filters_applied = {
            k: v for k, v in filters.items()
            if v is not None and v != '' and v != 'All'
        }

        return jsonify({
            'data': data,
            'total': total,
            'filters_applied': filters_applied
        }), 200

    except Exception as e:
        print(f"Error fetching student strength: {e}")
        return jsonify({'message': 'An error occurred while fetching student strength.'}), 500
    finally:
        if conn:
            cur.close()
            release_db_connection(conn)


@academic_bp.route('/stats/gender-trends', methods=['GET'])
@token_optional
def get_gender_trends(current_user_id):
    """Fetches gender distribution grouped by year of admission."""
    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        filters = {
            'program': request.args.get('program', type=str),
            'batch': request.args.get('batch', type=str),
            'branch': request.args.get('branch', type=str),
            'department': request.args.get('department', type=str),
            'category': request.args.get('category', type=str),
            'state': request.args.get('state', type=str),
            'pwd': request.args.get('pwd', type=str)
        }

        if filters['pwd'] == 'true':
            filters['pwd'] = True
        elif filters['pwd'] == 'false':
            filters['pwd'] = False
        elif filters['pwd'] == '' or filters['pwd'] is None:
            filters['pwd'] = None

        where_clause, params = build_filter_query(filters)

        # Use admission_year but alias as 'yearofadmission' for frontend compatibility
        query = f"""
            SELECT admission_year as yearofadmission, gender, COUNT(*) as count
            FROM {STUDENT_TABLE}
            {where_clause}
            GROUP BY admission_year, gender
            ORDER BY admission_year;
        """

        cur = conn.cursor()
        cur.execute(query, params)
        results = cur.fetchall()

        year_data = {}
        for row in results:
            year = row['yearofadmission']
            if year is None:
                continue

            gender = row['gender']
            count = row['count']

            if year not in year_data:
                year_data[year] = {'year': year, 'Male': 0, 'Female': 0, 'Transgender': 0}

            if gender in year_data[year]:
                year_data[year][gender] = count

        data = sorted(list(year_data.values()), key=lambda x: x['year'])

        return jsonify({'data': data}), 200

    except Exception as e:
        print(f"Error fetching gender trends: {e}")
        return jsonify({'message': 'An error occurred while fetching gender trends.'}), 500
    finally:
        if conn:
            cur.close()
            release_db_connection(conn)


@academic_bp.route('/stats/program-trends', methods=['GET'])
@token_optional
def get_program_trends(current_user_id):
    """
    Fetches student strength by program grouped by year of admission,
    including gender breakdown per program group (UG/PG/Research).
    Now supports full filter set: program, batch, department, state, category, pwd.
    Returns both aggregated program data and per-group gender counts.
    """
    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        filters = {
            'program': request.args.get('program', type=str),
            'batch': request.args.get('batch', type=str),
            'department': request.args.get('department', type=str),
            'category': request.args.get('category', type=str),
            'state': request.args.get('state', type=str),
            'pwd': request.args.get('pwd', type=str),
        }

        if filters['pwd'] == 'true':
            filters['pwd'] = True
        elif filters['pwd'] == 'false':
            filters['pwd'] = False
        elif filters['pwd'] == '' or filters['pwd'] is None:
            filters['pwd'] = None

        where_clause, params = build_filter_query(filters)

        # Fetch per-program, per-gender, per-year counts
        query = f"""
            SELECT
                admission_year  AS yearofadmission,
                programme_current AS program,
                academic_program_type,
                gender,
                COUNT(*) AS count
            FROM {STUDENT_TABLE}
            {where_clause}
            GROUP BY admission_year, programme_current, academic_program_type, gender
            ORDER BY admission_year;
        """

        cur = conn.cursor()
        cur.execute(query, params)
        results = cur.fetchall()

        # Build year → {program: count} for legacy chart data
        year_data = {}
        # Build year → {group: {gender: count}} for stacked gender data
        # group = UG | PG | Research  (derived from academic_program_type)
        year_gender_data = {}
        all_programs = set()

        def map_program_type_to_group(apt):
            if apt is None:
                return None
            apt_upper = apt.upper()
            if apt_upper == 'UG':
                return 'UG'
            if apt_upper == 'PG':
                return 'PG'
            if apt_upper == 'RESEARCH':
                return 'Research'
            return None

        for row in results:
            year = row['yearofadmission']
            if year is None:
                continue

            program = row['program']
            gender  = row['gender']
            count   = row['count']
            group   = map_program_type_to_group(row['academic_program_type'])

            all_programs.add(program)

            # --- legacy program-per-year aggregation ---
            if year not in year_data:
                year_data[year] = {'year': year}
            year_data[year][program] = year_data[year].get(program, 0) + count

            # --- gender-per-group-per-year aggregation ---
            if group:
                if year not in year_gender_data:
                    year_gender_data[year] = {}
                if group not in year_gender_data[year]:
                    year_gender_data[year][group] = {'Male': 0, 'Female': 0, 'Transgender': 0}
                if gender in year_gender_data[year][group]:
                    year_gender_data[year][group][gender] += count

        # Build final_data (legacy)
        final_data = []
        for year in sorted(year_data.keys()):
            entry = year_data[year]
            for prog in all_programs:
                if prog not in entry:
                    entry[prog] = 0
            final_data.append(entry)

        # Build gender_by_group_data — one entry per year with nested gender counts
        gender_by_group_data = []
        for year in sorted(year_gender_data.keys()):
            entry = {'year': year}
            for group in ['UG', 'PG', 'Research']:
                g = year_gender_data[year].get(group, {'Male': 0, 'Female': 0, 'Transgender': 0})
                entry[f'{group}_Male']        = g['Male']
                entry[f'{group}_Female']      = g['Female']
                entry[f'{group}_Transgender'] = g['Transgender']
                entry[f'{group}_Total']       = g['Male'] + g['Female'] + g['Transgender']
            entry['Total'] = (
                entry.get('UG_Total', 0) +
                entry.get('PG_Total', 0) +
                entry.get('Research_Total', 0)
            )
            gender_by_group_data.append(entry)

        return jsonify({
            'data': final_data,
            'programs': list(all_programs),
            'gender_by_group': gender_by_group_data,   # NEW — stacked gender data
        }), 200

    except Exception as e:
        import traceback
        print(f"Error fetching program trends: {e}\n{traceback.format_exc()}")
        return jsonify({'message': 'An error occurred while fetching program trends.'}), 500
    finally:
        if conn:
            cur.close()
            release_db_connection(conn)


@academic_bp.route('/stats/student-summary', methods=['GET'])
@token_optional
def get_student_summary(current_user_id):
    """
    Returns UG / PG / Research counts using the academic_program_type column.
    Optional ?year=YYYY filters to a specific admission year.
    """
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        year = request.args.get('year', type=str)

        if year:
            where = "WHERE CAST(admission_year AS TEXT) = %s"
            params = [year]
        else:
            where = ""
            params = []

        query = f"""
            SELECT
                COUNT(*)                                                         AS total_students,
                COUNT(*) FILTER (WHERE academic_program_type = 'UG')             AS ug_total,
                COUNT(*) FILTER (WHERE academic_program_type = 'PG')             AS pg_total,
                COUNT(*) FILTER (WHERE academic_program_type = 'Research')       AS research_total
            FROM {STUDENT_TABLE}
            {where};
        """

        cur = conn.cursor()
        cur.execute(query, params)
        row = cur.fetchone()

        return jsonify({
            'total_students':  int(row['total_students']  or 0),
            'ug_total':        int(row['ug_total']        or 0),
            'pg_total':        int(row['pg_total']        or 0),
            'research_total':  int(row['research_total']  or 0),
        }), 200

    except Exception as e:
        import traceback
        print(f"Error fetching student summary: {e}\n{traceback.format_exc()}")
        return jsonify({'message': 'An error occurred while fetching student summary.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@academic_bp.route('/stats/onroll-summary', methods=['GET'])
@token_optional
def get_onroll_summary(current_user_id):
    """
    Returns on-roll student counts by program type.
    """
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500

        # First, debug: check actual values in database
        debug_query = f"""
            SELECT DISTINCT academic_program_type, student_status
            FROM {STUDENT_TABLE}
            LIMIT 20;
        """
        cur = conn.cursor()
        cur.execute(debug_query)
        debug_results = cur.fetchall()
        print("DEBUG - Sample data from database:")
        for row in debug_results:
            print(f"  academic_program_type: '{row['academic_program_type']}' | student_status: '{row['student_status']}'")

        query = f"""
            SELECT
                COUNT(*) FILTER (
                    WHERE UPPER(COALESCE(academic_program_type, '')) = 'UG'
                      AND UPPER(COALESCE(student_status, '')) IN ('ON ROLL', 'SLOW-PACE')
                ) AS ug_onroll,

                COUNT(*) FILTER (
                    WHERE UPPER(COALESCE(academic_program_type, '')) = 'PG'
                      AND UPPER(COALESCE(student_status, '')) IN ('ON ROLL', 'SLOW-PACE')
                ) AS pg_onroll,

                COUNT(*) FILTER (
                    WHERE UPPER(COALESCE(academic_program_type, '')) = 'RESEARCH'
                      AND UPPER(COALESCE(student_status, '')) IN ('ON ROLL', 'ON LEAVE', 'VIVA VOCE COMPLETED', 'THESIS SUBMITTED')
                ) AS research_onroll

            FROM {STUDENT_TABLE};
        """

        cur.execute(query)
        row = cur.fetchone()

        ug_onroll       = int(row['ug_onroll']       or 0)
        pg_onroll       = int(row['pg_onroll']       or 0)
        research_onroll = int(row['research_onroll'] or 0)
        total_onroll    = ug_onroll + pg_onroll + research_onroll

        return jsonify({
            'total_onroll':    total_onroll,
            'ug_onroll':       ug_onroll,
            'pg_onroll':       pg_onroll,
            'research_onroll': research_onroll,
        }), 200

    except Exception as e:
        import traceback
        print(f"Error fetching on-roll summary: {e}\n{traceback.format_exc()}")
        return jsonify({'message': 'An error occurred while fetching on-roll summary.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)