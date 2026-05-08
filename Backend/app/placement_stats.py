from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import Any, Dict, Iterable, List, Sequence, Tuple

from flask import Blueprint, jsonify, request
from psycopg2.errors import UndefinedTable

from .auth import token_optional
from .db import get_db_connection, release_db_connection

placement_bp = Blueprint('placement', __name__)

PLACEMENT_SUMMARY_TABLE = 'placement_summary'
PLACEMENT_COMPANY_TABLE = 'placement_companies'
PLACEMENT_PACKAGES_TABLE = 'placement_packages'

PROGRAM_CATEGORY_MAP = {
    'BTech': 'UG',
    'MTech': 'PG',
    'MSc': 'PG',
    'MS': 'PG',
    'PhD': 'PhD',
}


def map_program_to_category(program: str) -> str:
    return PROGRAM_CATEGORY_MAP.get(program, 'Other')


def table_exists(table_name: str) -> bool:
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
            (table_name,)
        )
        row = cur.fetchone()
        return bool(row and row.get('exists_flag'))
    except Exception as exc:  # pragma: no cover - defensive logging
        print(f"Placement stats table check failed for {table_name}: {exc}")
        return False
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


def placement_data_available() -> bool:
    return table_exists(PLACEMENT_SUMMARY_TABLE)


def build_where_clause(mapping: Dict[str, str], filters: Dict[str, Any]) -> Tuple[str, List[Any]]:
    conditions: List[str] = []
    params: List[Any] = []

    for key, column in mapping.items():
        value = filters.get(key)
        if value in (None, '', 'All'):
            continue
        if isinstance(value, Sequence) and not isinstance(value, (str, bytes)):
            values = [item for item in value if item not in (None, '', 'All')]
            if values:
                placeholders = ', '.join(['%s'] * len(values))
                conditions.append(f"{column} IN ({placeholders})")
                params.extend(values)
        else:
            conditions.append(f"{column} = %s")
            params.append(value)

    clause = ''
    if conditions:
        clause = 'WHERE ' + ' AND '.join(conditions)
    return clause, params


def safe_percentage(numerator: float, denominator: float) -> float:
    if not denominator:
        return 0.0
    return round((numerator / denominator) * 100, 2)


@placement_bp.route('/filter-options', methods=['GET'])
@token_optional
def get_filter_options(current_user_id):
    if not placement_data_available():
        return jsonify({
            'message': (
                "Placement tables not found. Please apply the latest schema.sql so the placement dashboard can load data."
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
            'program': request.args.get('program'),
            'gender': request.args.get('gender'),
            'sector': request.args.get('sector'),
        }

        # Handle 'All'
        for k, v in current_filters.items():
            if v == 'All' or v == '':
                current_filters[k] = None

        def get_summary_where_except(exclude_key):
            temp_filters = {k: v for k, v in current_filters.items() if k != exclude_key}
            where, params = build_where_clause(
                {'year': 'placement_year', 'program': 'program', 'gender': 'gender::text', 'branch': 'branch'},
                temp_filters
            )
            # Apply sector filter if it exists and is not excluded
            if temp_filters.get('sector'):
                subquery = "placement_year IN (SELECT DISTINCT placement_year FROM placement_companies WHERE sector = %s)"
                where += (" AND " if where else "WHERE ") + subquery
                params.append(temp_filters['sector'])
            return where, params

        def get_company_where_except(exclude_key):
            temp_filters = {k: v for k, v in current_filters.items() if k != exclude_key}
            where, params = build_where_clause(
                {'year': 'placement_year', 'sector': 'sector'},
                temp_filters
            )
            # Apply program/gender filter if they exist and are not excluded
            if temp_filters.get('program') or temp_filters.get('gender'):
                sub_where, sub_params = build_where_clause(
                    {'program': 'program', 'gender': 'gender::text', 'branch': 'branch'},
                    temp_filters
                )
                if sub_where:
                    subquery = f"placement_year IN (SELECT DISTINCT placement_year FROM placement_summary {sub_where})"
                    where += (" AND " if where else "WHERE ") + subquery
                    params.extend(sub_params)
            return where, params

        filter_options = {}

        # Years
        where, params = get_summary_where_except('year')
        cur.execute(f"SELECT DISTINCT placement_year FROM {PLACEMENT_SUMMARY_TABLE} {where} ORDER BY placement_year DESC", params)
        filter_options['years'] = [row['placement_year'] for row in cur.fetchall() if row['placement_year']]

        # Programs
        where, params = get_summary_where_except('program')
        cur.execute(f"SELECT DISTINCT program FROM {PLACEMENT_SUMMARY_TABLE} {where} ORDER BY program", params)
        filter_options['programs'] = [row['program'] for row in cur.fetchall() if row['program']]

        # Genders
        where, params = get_summary_where_except('gender')
        cur.execute(f"SELECT DISTINCT gender::text FROM {PLACEMENT_SUMMARY_TABLE} {where} ORDER BY gender::text", params)
        filter_options['genders'] = [row['gender'] for row in cur.fetchall() if row['gender']]

        # Branches
        where, params = get_summary_where_except('branch')
        cur.execute(f"SELECT DISTINCT branch FROM {PLACEMENT_SUMMARY_TABLE} {where} ORDER BY branch", params)
        filter_options['branches'] = [row['branch'] for row in cur.fetchall() if row['branch']]

        # Sectors
        where, params = get_company_where_except('sector')
        cur.execute(f"SELECT DISTINCT sector FROM {PLACEMENT_COMPANY_TABLE} {where} {'AND' if where else 'WHERE'} sector IS NOT NULL AND sector <> '' ORDER BY sector", params)
        filter_options['sectors'] = [row['sector'] for row in cur.fetchall() if row['sector']]

        return jsonify(filter_options), 200

    except UndefinedTable:
        return jsonify({
            'message': (
                "Placement tables are missing. Please run the latest database migrations first."
            )
        }), 500
    except Exception as exc:
        print(f"Placement filter options error: {exc}")
        return jsonify({'message': 'Failed to fetch placement filter options.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@placement_bp.route('/summary', methods=['GET'])
@token_optional
def get_placement_summary(current_user_id):
    if not placement_data_available():
        return jsonify({'message': 'Placement tables are missing.'}), 500

    year_filter = request.args.get('year')
    program_filter = request.args.get('program')
    gender_filter = request.args.get('gender')
    sector_filter = request.args.get('sector')

    # If year is 'All' or not specified, default to the latest academic year
    # as per user request to show latest status instead of cumulative.
    if not year_filter or year_filter == 'All':
        conn = None
        cur = None
        try:
            conn = get_db_connection()
            if conn:
                cur = conn.cursor()
                # Find the latest academic year using the format '2024-25'
                cur.execute(f"SELECT placement_year FROM {PLACEMENT_SUMMARY_TABLE} ORDER BY CAST(SPLIT_PART(placement_year, '-', 1) AS INTEGER) DESC LIMIT 1")
                row = cur.fetchone()
                if row:
                    year_filter = row['placement_year']
        except Exception as e:
            print(f"Error finding latest placement year: {e}")
        finally:
            if cur: cur.close()
            if conn: release_db_connection(conn)

    filters = {
        'year': year_filter,
        'program': program_filter,
        'gender': gender_filter,
        'branch': request.args.get('branch'),
        'sector': sector_filter,
    }

    summary_where, summary_params = build_where_clause(
        {'year': 'placement_year', 'program': 'program', 'gender': 'gender::text', 'branch': 'branch'},
        filters
    )
    # placement_packages has year and program but no gender column
    pkg_where, pkg_params = build_where_clause(
        {'year': 'placement_year', 'program': 'program'},
        filters
    )

    # sector filtering for summary/packages (subquery-based as tables lack direct column)
    if filters.get('sector') and filters.get('sector') != 'All':
        sector_subquery = "placement_year IN (SELECT DISTINCT placement_year FROM placement_companies WHERE sector = %s)"
        summary_where += (" AND " if summary_where else "WHERE ") + sector_subquery
        summary_params.append(filters.get('sector'))
        pkg_where += (" AND " if pkg_where else "WHERE ") + sector_subquery
        pkg_params.append(filters.get('sector'))

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT SUM(registered) AS registered, SUM(placed) AS placed
            FROM {PLACEMENT_SUMMARY_TABLE}
            {summary_where}
            """,
            summary_params
        )
        row = cur.fetchone() or {'registered': 0, 'placed': 0}
        total_registered = row.get('registered') or 0
        total_placed = row.get('placed') or 0

        cur.execute(
            f"""
            SELECT
                MAX(NULLIF(highest_package, 0)) AS highest_package,
                MIN(NULLIF(lowest_package,  0)) AS lowest_package,
                AVG(NULLIF(average_package, 0)) AS average_package
            FROM {PLACEMENT_PACKAGES_TABLE}
            {pkg_where}
            """,
            pkg_params
        )
        package_row = cur.fetchone() or {}
        summary = {
            'registered': int(total_registered),
            'placed': int(total_placed),
            'placement_percentage': safe_percentage(total_placed, total_registered),
            'highest_package': package_row.get('highest_package'),
            'lowest_package': package_row.get('lowest_package'),
            'average_package': package_row.get('average_package'),
            'year': filters.get('year')
        }
        return jsonify({'data': summary}), 200
    except UndefinedTable:
        return jsonify({'message': 'Placement tables are missing.'}), 500
    except Exception as exc:
        print(f"Placement summary error: {exc}")
        return jsonify({'message': 'Failed to fetch placement summary data.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@placement_bp.route('/percentage-trend', methods=['GET'])
@token_optional
def get_percentage_trend(current_user_id):
    if not placement_data_available():
        return jsonify({'message': 'Placement tables are missing.'}), 500

    filters = {
        'year': request.args.get('year'),
        'program': request.args.get('program'),
        'gender': request.args.get('gender'),
        'branch': request.args.get('branch'),
    }
    where_clause, params = build_where_clause(
        {'year': 'placement_year', 'program': 'program', 'gender': 'gender::text', 'branch': 'branch'},
        filters
    )

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT placement_year, SUM(registered) AS registered, SUM(placed) AS placed
            FROM {PLACEMENT_SUMMARY_TABLE}
            {where_clause}
            GROUP BY placement_year
            ORDER BY placement_year
            """,
            params
        )
        rows = cur.fetchall() or []
        data = []
        for row in rows:
            registered = row.get('registered') or 0
            placed = row.get('placed') or 0
            data.append({
                'year': row.get('placement_year'),
                'registered': int(registered),
                'placed': int(placed),
                'placement_percentage': safe_percentage(placed, registered)
            })
        return jsonify({'data': data}), 200
    except UndefinedTable:
        return jsonify({'message': 'Placement tables are missing.'}), 500
    except Exception as exc:
        print(f"Placement percentage trend error: {exc}")
        return jsonify({'message': 'Failed to fetch placement percentage trend.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@placement_bp.route('/gender-breakdown', methods=['GET'])
@token_optional
def get_gender_breakdown(current_user_id):
    if not placement_data_available():
        return jsonify({'message': 'Placement tables are missing.'}), 500

    filters = {
        'year': request.args.get('year'),
        'program': request.args.get('program'),
        'gender': request.args.get('gender'),
        'branch': request.args.get('branch'),
    }
    where_clause, params = build_where_clause(
        {'year': 'placement_year', 'program': 'program', 'gender': 'gender::text', 'branch': 'branch'},
        filters
    )

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT gender::text AS gender, SUM(registered) AS registered, SUM(placed) AS placed
            FROM {PLACEMENT_SUMMARY_TABLE}
            {where_clause}
            GROUP BY gender::text
            ORDER BY gender::text
            """,
            params
        )
        rows = cur.fetchall() or []
        data = []
        for row in rows:
            registered = row.get('registered') or 0
            placed = row.get('placed') or 0
            data.append({
                'gender': row.get('gender'),
                'registered': int(registered),
                'placed': int(placed),
                'placement_percentage': safe_percentage(placed, registered)
            })
        return jsonify({'data': data}), 200
    except UndefinedTable:
        return jsonify({'message': 'Placement tables are missing.'}), 500
    except Exception as exc:
        print(f"Placement gender breakdown error: {exc}")
        return jsonify({'message': 'Failed to fetch gender breakdown.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@placement_bp.route('/program-status', methods=['GET'])
@token_optional
def get_program_status(current_user_id):
    if not placement_data_available():
        return jsonify({'message': 'Placement tables are missing.'}), 500

    filters = {
        'year': request.args.get('year'),
        'program': request.args.get('program'),
        'gender': request.args.get('gender'),
        'branch': request.args.get('branch'),
    }
    where_clause, params = build_where_clause(
        {'year': 'placement_year', 'program': 'program', 'gender': 'gender', 'branch': 'branch'},
        filters
    )

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT program, SUM(registered) AS registered, SUM(placed) AS placed
            FROM {PLACEMENT_SUMMARY_TABLE}
            {where_clause}
            GROUP BY program
            ORDER BY SUM(registered) DESC
            LIMIT 10
            """,
            params
        )
        rows = cur.fetchall() or []
        data = []
        for row in rows:
            program = row.get('program') or 'Unknown'
            registered = row.get('registered') or 0
            placed = row.get('placed') or 0
            data.append({
                'program_category': program,
                'registered': int(registered),
                'placed': int(placed),
                'placement_percentage': safe_percentage(placed, registered)
            })

        return jsonify({'data': data}), 200
    except UndefinedTable:
        return jsonify({'message': 'Placement tables are missing.'}), 500
    except Exception as exc:
        print(f"Placement program status error: {exc}")
        return jsonify({'message': 'Failed to fetch program-wise placement status.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@placement_bp.route('/recruiters', methods=['GET'])
@token_optional
def get_recruiter_counts(current_user_id):
    if not placement_data_available():
        return jsonify({'message': 'Placement tables are missing.'}), 500

    filters = {
        'year': request.args.get('year'),
        'program': request.args.get('program'),
        'sector': request.args.get('sector'),
    }
    where_clause, params = build_where_clause(
        {'year': 'placement_year', 'sector': 'sector'},
        filters
    )

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT placement_year, COUNT(DISTINCT company_name) AS company_count, SUM(offers) AS offers
            FROM {PLACEMENT_COMPANY_TABLE}
            {where_clause}
            GROUP BY placement_year
            ORDER BY placement_year
            """,
            params
        )
        rows = cur.fetchall() or []
        data = []
        for row in rows:
            data.append({
                'year': row.get('placement_year'),
                'companies': int(row.get('company_count') or 0),
                'offers': int(row.get('offers') or 0)
            })
        return jsonify({'data': data}), 200
    except UndefinedTable:
        return jsonify({'message': 'Placement tables are missing.'}), 500
    except Exception as exc:
        print(f"Placement recruiter count error: {exc}")
        return jsonify({'message': 'Failed to fetch recruiter statistics.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@placement_bp.route('/sector-distribution', methods=['GET'])
@token_optional
def get_sector_distribution(current_user_id):
    if not placement_data_available():
        return jsonify({'message': 'Placement tables are missing.'}), 500

    filters = {
        'year': request.args.get('year'),
        'program': request.args.get('program'),
        'sector': request.args.get('sector'),
    }
    where_clause, params = build_where_clause(
        {'year': 'placement_year', 'sector': 'sector'},
        filters
    )

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT COALESCE(NULLIF(sector, ''), 'Unspecified') AS sector,
                   COUNT(DISTINCT company_name) AS company_count,
                   SUM(offers) AS offers
            FROM {PLACEMENT_COMPANY_TABLE}
            {where_clause}
            GROUP BY COALESCE(NULLIF(sector, ''), 'Unspecified')
            ORDER BY sector
            """,
            params
        )
        rows = cur.fetchall() or []
        data = []
        for row in rows:
            data.append({
                'sector': row.get('sector'),
                'companies': int(row.get('company_count') or 0),
                'offers': int(row.get('offers') or 0)
            })
        return jsonify({'data': data}), 200
    except UndefinedTable:
        return jsonify({'message': 'Placement tables are missing.'}), 500
    except Exception as exc:
        print(f"Placement sector distribution error: {exc}")
        return jsonify({'message': 'Failed to fetch sector distribution.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@placement_bp.route('/package-trend', methods=['GET'])
@token_optional
def get_package_trend(current_user_id):
    if not placement_data_available():
        return jsonify({'message': 'Placement tables are missing.'}), 500

    year    = request.args.get('year')
    program = request.args.get('program')
    sector  = request.args.get('sector')

    # Build WHERE conditions manually so we can alias the table and use a sector subquery
    conditions: List[str] = []
    params: List[Any] = []

    if year not in (None, '', 'All'):
        conditions.append("pp.placement_year = %s")
        params.append(year)

    if program not in (None, '', 'All'):
        conditions.append("pp.program = %s")
        params.append(program)

    # Exclude rows where all three package columns are zero or null
    conditions.append(
        "(pp.highest_package IS NOT NULL AND pp.highest_package <> 0"
        " OR pp.lowest_package  IS NOT NULL AND pp.lowest_package  <> 0"
        " OR pp.average_package IS NOT NULL AND pp.average_package <> 0)"
    )

    if sector not in (None, '', 'All'):
        # Filter to placement years that have at least one company in the chosen sector
        conditions.append(
            "pp.placement_year IN ("
            "  SELECT DISTINCT placement_year FROM placement_companies WHERE sector = %s"
            ")"
        )
        params.append(sector)

    where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    conn = None
    cur  = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT pp.placement_year,
                   MAX(NULLIF(pp.highest_package, 0)) AS highest_package,
                   MIN(NULLIF(pp.lowest_package,  0)) AS lowest_package,
                   AVG(NULLIF(pp.average_package, 0)) AS average_package
            FROM {PLACEMENT_PACKAGES_TABLE} pp
            {where_clause}
            GROUP BY pp.placement_year
            ORDER BY pp.placement_year
            """,
            params
        )
        rows = cur.fetchall() or []
        data = []
        for row in rows:
            highest = row.get('highest_package')
            lowest  = row.get('lowest_package')
            average = row.get('average_package')
            # Skip years where everything is still null after aggregation
            if not any([highest, lowest, average]):
                continue
            data.append({
                'year':    row.get('placement_year'),
                'highest': float(highest) if highest is not None else None,
                'lowest':  float(lowest)  if lowest  is not None else None,
                'average': float(average) if average is not None else None,
            })
        return jsonify({'data': data}), 200
    except UndefinedTable:
        return jsonify({'message': 'Placement tables are missing.'}), 500
    except Exception as exc:
        print(f"Placement package trend error: {exc}")
        return jsonify({'message': 'Failed to fetch placement package trend.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@placement_bp.route('/top-recruiters', methods=['GET'])
@token_optional
def get_top_recruiters(current_user_id):
    if not placement_data_available():
        return jsonify({'message': 'Placement tables are missing.'}), 500

    filters = {
        'year': request.args.get('year'),
        'program': request.args.get('program'),
        'sector': request.args.get('sector'),
    }
    where_clause, params = build_where_clause(
        {'year': 'placement_year', 'sector': 'sector'},
        filters
    )

    limit = request.args.get('limit', default=5, type=int)
    limit = max(1, min(limit, 20))

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed.'}), 500
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT placement_year, company_name, sector, offers, hires, is_top_recruiter
            FROM {PLACEMENT_COMPANY_TABLE}
            {where_clause}
            ORDER BY offers DESC, hires DESC, company_name ASC
            LIMIT %s
            """,
            params + [limit]
        )
        rows = cur.fetchall() or []
        data = []
        for row in rows:
            data.append({
                'year': row.get('placement_year'),
                'company_name': row.get('company_name'),
                'sector': row.get('sector'),
                'offers': int(row.get('offers') or 0),
                'hires': int(row.get('hires') or 0),
                'is_top_recruiter': bool(row.get('is_top_recruiter')),
            })
        return jsonify({'data': data}), 200
    except UndefinedTable:
        return jsonify({'message': 'Placement tables are missing.'}), 500
    except Exception as exc:
        print(f"Placement top recruiters error: {exc}")
        return jsonify({'message': 'Failed to fetch top recruiters.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)