"""Analytics for the Academic module (courses_table)."""
from flask import Blueprint, jsonify, request

from .auth import token_required
from .db import get_db_connection

academic_module_bp = Blueprint('academic_module', __name__)

COURSES_TABLE = 'courses_table'


def build_where_clause(filters, mapping):
    """Builds a parameterised WHERE clause from a dict of active filters."""
    conditions, params = [], []
    for key, column in mapping.items():
        value = filters.get(key)
        if value in (None, '', 'All'):
            continue
        conditions.append(f"{column} = %s")
        params.append(value)
    clause = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''
    return clause, params


def table_exists(table_name: str) -> bool:
    """Returns True if the given table exists in the public schema."""
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return False
        cur = conn.cursor()
        cur.execute(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = %s) AS exists_flag;",
            (table_name,)
        )
        row = cur.fetchone()
        return bool(row and row.get('exists_flag'))
    except Exception as exc:
        print(f"Table check failed ({table_name}): {exc}")
        return False
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def module_tables_available() -> bool:
    return table_exists(COURSES_TABLE)


# ===================== Filter Options =====================

@academic_module_bp.route('/filter-options', methods=['GET'])
@token_required
def get_filter_options(current_user_id):
    if not module_tables_available():
        return jsonify({'message': 'Academic module tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()

        # Normalise helper: lowercase + strip spaces and commas
        NORM = "REGEXP_REPLACE(LOWER({col}), '[\\s,]+', '', 'g')"

        cur.execute(f"""
            SELECT
                -- categories: normalise, skip blank
                ARRAY(
                    SELECT DISTINCT {NORM.format(col='course_category')}
                    FROM {COURSES_TABLE}
                    WHERE UPPER(is_industry_course) IN ('YES', 'TRUE', 'T')
                      AND COALESCE(TRIM(course_category), '') != ''
                    ORDER BY 1
                ) AS categories,

                -- programmes: normalise, skip blank
                ARRAY(
                    SELECT DISTINCT {NORM.format(col='target_programme')}
                    FROM {COURSES_TABLE}
                    WHERE UPPER(is_industry_course) IN ('YES', 'TRUE', 'T')
                      AND COALESCE(TRIM(target_programme), '') != ''
                    ORDER BY 1
                ) AS programmes,

                -- proposal_types: normalise; blank/NULL → 'old'
                ARRAY(
                    SELECT DISTINCT
                        CASE
                            WHEN COALESCE(TRIM({NORM.format(col='COALESCE(proposal_type,\'\')')}), '') = ''
                            THEN 'old'
                            ELSE {NORM.format(col='proposal_type')}
                        END
                    FROM {COURSES_TABLE}
                    WHERE UPPER(is_industry_course) IN ('YES', 'TRUE', 'T')
                    ORDER BY 1
                ) AS proposal_types,

                -- disciplines: normalise, skip blank
                ARRAY(
                    SELECT DISTINCT {NORM.format(col='target_discipline')}
                    FROM {COURSES_TABLE}
                    WHERE UPPER(is_industry_course) IN ('YES', 'TRUE', 'T')
                      AND COALESCE(TRIM(target_discipline), '') != ''
                    ORDER BY 1
                ) AS disciplines
        """)
        row = cur.fetchone() or {}
        return jsonify({
            'categories':     row.get('categories')     or [],
            'programmes':     row.get('programmes')     or [],
            # status is a binary derived field — only two meaningful values
            'statuses':       ['Active', 'Inactive'],
            'proposal_types': row.get('proposal_types') or [],
            'disciplines':    row.get('disciplines')    or [],
        }), 200
    except UndefinedTable:
        return jsonify({'message': 'Academic module tables are missing.'}), 500
    except Exception as exc:
        print(f"Academic module filter error: {exc}")
        return jsonify({'message': 'Failed to fetch filter options.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ===================== Summary =====================

@academic_module_bp.route('/summary', methods=['GET'])
@token_required
def get_summary(current_user_id):
    if not module_tables_available():
        return jsonify({'message': 'Academic module tables are missing.'}), 500

    filters = {
        'category': request.args.get('category'),
        'programme': request.args.get('programme'),
        'status': request.args.get('status'),
    }

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()

        where_clause, params = build_where_clause(
            filters,
            {
                'category': 'course_category',
                'programme': 'target_programme',
                'status': 'industry_course_status_currentay',
            }
        )
        # Global filter for industry courses (captures 'YES', 'TRUE', or 'T')
        industry_filter = "UPPER(is_industry_course) IN ('YES', 'TRUE', 'T')"
        if where_clause:
            where_clause += f" AND {industry_filter}"
        else:
            where_clause = f"WHERE {industry_filter}"

        cur.execute(
            f"""
            SELECT
                COUNT(*) AS total_courses,
                COUNT(DISTINCT course_category) AS distinct_categories,
                COUNT(DISTINCT target_programme) AS distinct_programmes,
                COUNT(DISTINCT target_discipline) AS distinct_disciplines,
                COUNT(CASE WHEN UPPER(industry_course_status_currentay) IN ('ACTIVE', 'RUNNING') THEN 1 END) AS active_courses,
                COUNT(CASE WHEN UPPER(industry_course_status_currentay) = 'INACTIVE' THEN 1 END) AS inactive_courses
            FROM {COURSES_TABLE}
            {where_clause}
            """,
            params
        )
        row = cur.fetchone() or {}

        summary = {
            'total_courses': int(row.get('total_courses') or 0),
            'distinct_categories': int(row.get('distinct_categories') or 0),
            'distinct_programmes': int(row.get('distinct_programmes') or 0),
            'distinct_disciplines': int(row.get('distinct_disciplines') or 0),
            'active_courses': int(row.get('active_courses') or 0),
            'inactive_courses': int(row.get('inactive_courses') or 0),
        }
        return jsonify({'data': summary}), 200
    except UndefinedTable:
        return jsonify({'message': 'Academic module tables are missing.'}), 500
    except Exception as exc:
        print(f"Academic module summary error: {exc}")
        return jsonify({'message': 'Failed to compute summary.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ===================== Category Breakdown =====================

@academic_module_bp.route('/category-breakdown', methods=['GET'])
@token_required
def get_category_breakdown(current_user_id):
    """Course count by category (CORE, ELECTIVE, MOOC)."""
    if not module_tables_available():
        return jsonify({'message': 'Academic module tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()

        cur.execute(f"""
            SELECT
                COALESCE(course_category, 'Uncategorized') AS category,
                COUNT(*) AS count
            FROM {COURSES_TABLE}
            WHERE UPPER(is_industry_course) IN ('YES', 'TRUE', 'T')
            GROUP BY course_category
            ORDER BY count DESC;
        """)
        rows = cur.fetchall() or []
        data = [
            {'category': row.get('category'), 'count': int(row.get('count') or 0)}
            for row in rows
        ]
        return jsonify({'data': data}), 200
    except UndefinedTable:
        return jsonify({'message': 'Academic module tables are missing.'}), 500
    except Exception as exc:
        print(f"Category breakdown error: {exc}")
        return jsonify({'message': 'Failed to fetch category breakdown.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ===================== Programme Breakdown =====================

@academic_module_bp.route('/programme-breakdown', methods=['GET'])
@token_required
def get_programme_breakdown(current_user_id):
    """Course count by target programme (BTECH, MTECH, MSC, PHD)."""
    if not module_tables_available():
        return jsonify({'message': 'Academic module tables are missing.'}), 500

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()

        cur.execute(f"""
            SELECT
                COALESCE(target_programme, 'Unspecified') AS programme,
                COUNT(*) AS count
            FROM {COURSES_TABLE}
            WHERE UPPER(is_industry_course) IN ('YES', 'TRUE', 'T')
            GROUP BY target_programme
            ORDER BY count DESC;
        """)
        rows = cur.fetchall() or []
        data = [
            {'programme': row.get('programme'), 'count': int(row.get('count') or 0)}
            for row in rows
        ]
        return jsonify({'data': data}), 200
    except UndefinedTable:
        return jsonify({'message': 'Academic module tables are missing.'}), 500
    except Exception as exc:
        print(f"Programme breakdown error: {exc}")
        return jsonify({'message': 'Failed to fetch programme breakdown.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ===================== Course List =====================

@academic_module_bp.route('/courses', methods=['GET'])
@token_required
def get_courses(current_user_id):
    """Paginated, filterable course list."""
    if not module_tables_available():
        return jsonify({'message': 'Academic module tables are missing.'}), 500

    filters = {
        'category': request.args.get('category'),
        'programme': request.args.get('programme'),
        'status': request.args.get('status'),
        'proposal_type': request.args.get('proposal_type'),
    }
    search = request.args.get('search', '', type=str).strip()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()

        # Build WHERE conditions with normalised matching
        NORM = "REGEXP_REPLACE(LOWER(COALESCE({col}, '')), '[\\s,]+', '', 'g')"
        conditions = ["UPPER(is_industry_course) IN ('YES', 'TRUE', 'T')"]
        params = []

        category = filters.get('category')
        if category not in (None, '', 'All'):
            conditions.append(f"{NORM.format(col='course_category')} = %s")
            params.append(category)

        programme = filters.get('programme')
        if programme not in (None, '', 'All'):
            conditions.append(f"{NORM.format(col='target_programme')} = %s")
            params.append(programme)

        # status: 'Active' → industry_course_status_currentay = 'YES' (case-insensitive)
        #         'Inactive' → everything else (including NULL)
        status = filters.get('status')
        if status == 'Active':
            conditions.append("UPPER(COALESCE(industry_course_status_currentay, '')) = 'YES'")
        elif status == 'Inactive':
            conditions.append("UPPER(COALESCE(industry_course_status_currentay, '')) != 'YES'")

        # proposal_type: normalised match; 'old' also matches blank/NULL rows
        proposal_type = filters.get('proposal_type')
        if proposal_type not in (None, '', 'All'):
            norm_col = NORM.format(col='proposal_type')
            if proposal_type == 'old':
                conditions.append(f"COALESCE({norm_col}, '') IN ('', 'old')")
            else:
                conditions.append(f"{norm_col} = %s")
                params.append(proposal_type)

        where_clause = "WHERE " + " AND ".join(conditions)

        # Add search
        if search:
            search_cond = "(course_code ILIKE %s OR course_name ILIKE %s OR proposing_faculty_name ILIKE %s)"
            pattern = f'%{search}%'
            if where_clause:
                where_clause += f" AND {search_cond}"
            else:
                where_clause = f"WHERE {search_cond}"
            params.extend([pattern, pattern, pattern])

        # Total count
        cur.execute(f"SELECT COUNT(*) AS total FROM {COURSES_TABLE} {where_clause}", params)
        total = (cur.fetchone() or {}).get('total', 0)

        # Paginated data
        offset = (page - 1) * per_page
        cur.execute(
            f"""
            SELECT
                course_code,
                course_name,
                credit_l_t_p_c,
                course_category,
                proposing_faculty_name,
                faculty_affiliation,
                target_programme,
                target_discipline,
                industry_partner,
                industry_coordinator_name,
                CASE 
                    WHEN UPPER(industry_course_status_currentay) IN ('ACTIVE', 'RUNNING') THEN 'Active'
                    ELSE 'Inactive'
                END AS status,
                proposal_type
            FROM {COURSES_TABLE}
            {where_clause}
            ORDER BY course_code ASC
            LIMIT %s OFFSET %s
            """,
            params + [per_page, offset]
        )
        rows = cur.fetchall() or []
        courses = [dict(row) for row in rows]

        return jsonify({
            'data': courses,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': (total + per_page - 1) // per_page if total > 0 else 0
            }
        }), 200
    except UndefinedTable:
        return jsonify({'message': 'Academic module tables are missing.'}), 500
    except Exception as exc:
        print(f"Course list error: {exc}")
        return jsonify({'message': 'Failed to fetch course list.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ===================== Legacy endpoint stubs =====================

@academic_module_bp.route('/industry-course-trend', methods=['GET'])
@token_required
def get_industry_course_trend(current_user_id):
    """Legacy endpoint — industry_courses table has been removed."""
    return jsonify({'message': 'industry_courses table has been removed. Use /courses and /category-breakdown instead.'}), 404


@academic_module_bp.route('/industry-courses', methods=['GET'])
@token_required
def get_industry_courses(current_user_id):
    """Legacy endpoint — industry_courses table has been removed."""
    return jsonify({'message': 'industry_courses table has been removed. Use /courses instead.'}), 404


@academic_module_bp.route('/program-launch-stats', methods=['GET'])
@token_required
def get_program_launch_stats(current_user_id):
    """Legacy endpoint — academic_program_launch table has been removed."""
    return jsonify({'message': 'academic_program_launch table has been removed. Use /programme-breakdown instead.'}), 404


@academic_module_bp.route('/program-list', methods=['GET'])
@token_required
def get_program_list(current_user_id):
    """Legacy endpoint — academic_program_launch table has been removed."""
    return jsonify({'message': 'academic_program_launch table has been removed. Use /courses instead.'}), 404
