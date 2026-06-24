"""
Blueprint providing analytics for the Research module:
 - ICSR (projects, MoUs, patents)
 - Administrative (faculty externships)
 - Library (research publications)
"""
from collections import defaultdict
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from flask import Blueprint, jsonify, request
from psycopg2 import extras

from .auth import token_optional
from .db import get_db_connection, release_db_connection


research_bp = Blueprint('research_module', __name__)


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
        # Handle both tuple and dict cursors
        if isinstance(result, dict):
            return bool(result.get('exists', False))
        return bool(result[0] if result else False)
    except Exception:
        return False
    finally:
        cur.close()


def _decimal_to_float(value):
    if isinstance(value, Decimal):
        return float(value)
    return value


def _serialize_date(value):
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return value.isoformat()


def _build_project_filters(
    department: Optional[str],
    project_year: Optional[str],
    status: Optional[str],
    dept_column: str = 'department',
) -> Tuple[str, List[Any]]:
    """Build WHERE clause for icsr_sponsered_projects or icsr_consultancy_projects.

    Args:
        dept_column: Column name for department. Use 'principal_investigator_department'
                     for icsr_sponsered_projects and 'department' for icsr_consultancy_projects.
    """
    conditions: List[str] = []
    params: List[Any] = []

    if department and department != 'All':
        conditions.append(f"{dept_column} = %s")
        params.append(department)

    if project_year and project_year != 'All':
        try:
            year_int = int(project_year)
            conditions.append(
                "EXTRACT(YEAR FROM COALESCE(start_date, end_date))::INT = %s"
            )
            params.append(year_int)
        except ValueError:
            pass

    if status and status != 'All':
        conditions.append("status = %s")
        params.append(status)

    clause = ""
    if conditions:
        clause = "WHERE " + " AND ".join(conditions)
    return clause, params


def _build_year_filter(column: str, year_value: Optional[str]) -> Tuple[str, List[Any]]:
    if not year_value or year_value == 'All':
        return "", []
    try:
        year_int = int(year_value)
    except ValueError:
        return "", []
    clause = f"WHERE EXTRACT(YEAR FROM {column})::INT = %s"
    return clause, [year_int]


def _build_patent_filters(
    patent_year: Optional[str],
    patent_status: Optional[str],
) -> Tuple[str, List[Any]]:
    conditions: List[str] = []
    params: List[Any] = []

    if patent_year and patent_year != 'All':
        try:
            year_int = int(patent_year)
            conditions.append(
                "EXTRACT(YEAR FROM filing_date)::INT = %s"
            )
            params.append(year_int)
        except ValueError:
            pass

    if patent_status and patent_status != 'All':
        conditions.append("patent_status = %s")
        params.append(patent_status)

    clause = ""
    if conditions:
        clause = "WHERE " + " AND ".join(conditions)
    return clause, params


def _build_publication_filters(
    department: Optional[str],
    publication_year: Optional[str],
    publication_type: Optional[str],
) -> Tuple[str, List[Any]]:
    conditions: List[str] = []
    params: List[Any] = []

    if department and department != 'All':
        conditions.append("department = %s")
        params.append(department)

    if publication_year and publication_year != 'All':
        try:
            year_int = int(publication_year)
            conditions.append("publication_year = %s")
            params.append(year_int)
        except ValueError:
            pass

    if publication_type and publication_type != 'All':
        conditions.append("publication_type = %s")
        params.append(publication_type)

    clause = ""
    if conditions:
        clause = "WHERE " + " AND ".join(conditions)
    return clause, params


@research_bp.route('/filter-options', methods=['GET'])
@token_optional
def get_filter_options(current_user_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()

        # Read current active filters
        department = request.args.get('department')
        project_year = request.args.get('project_year')
        status = request.args.get('status')
        patent_year = request.args.get('patent_year')
        patent_status = request.args.get('patent_status')
        publication_year = request.args.get('publication_year')
        publication_type = request.args.get('publication_type')
        mou_year = request.args.get('mou_year')

        def clean(v): return None if (v is None or v in ('', 'All')) else v
        department = clean(department)
        project_year = clean(project_year)
        status = clean(status)
        patent_year = clean(patent_year)
        patent_status = clean(patent_status)
        publication_year = clean(publication_year)
        publication_type = clean(publication_type)
        mou_year = clean(mou_year)

        filters: Dict[str, List[Any]] = {
            'project_departments': [],
            'project_years': [],
            'project_statuses': [],
            'project_types': [],
            'mou_years': [],
            'patent_years': [],
            'patent_statuses': [],
            'publication_departments': [],
            'publication_years': [],
            'publication_types': [],
            'externship_departments': [],
            'externship_years': [],
        }

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        # --- Project filters: cross-filter using status & year (but not the one being fetched) ---
        depts = set(); years = set(); statuses = set()

        if _table_exists(conn, 'icsr_sponsered_projects'):
            # Departments: filter by year+status
            wc_d, p_d = _build_project_filters(None, project_year, status, 'principal_investigator_department')
            cur.execute(f"SELECT DISTINCT principal_investigator_department AS dept FROM icsr_sponsered_projects {wc_d} WHERE principal_investigator_department IS NOT NULL" if not wc_d else f"SELECT DISTINCT principal_investigator_department AS dept FROM icsr_sponsered_projects {wc_d} AND principal_investigator_department IS NOT NULL", p_d)
            depts.update(row['dept'] for row in cur.fetchall())
            # Years: filter by dept+status
            wc_y, p_y = _build_project_filters(department, None, status, 'principal_investigator_department')
            cur.execute(f"SELECT DISTINCT EXTRACT(YEAR FROM COALESCE(start_date, end_date))::INT AS year FROM icsr_sponsered_projects {wc_y} {'AND' if wc_y else 'WHERE'} (start_date IS NOT NULL OR end_date IS NOT NULL)", p_y)
            years.update(int(row['year']) for row in cur.fetchall() if row['year'] is not None)
            # Statuses: filter by dept+year
            wc_s, p_s = _build_project_filters(department, project_year, None, 'principal_investigator_department')
            cur.execute(f"SELECT DISTINCT status FROM icsr_sponsered_projects {wc_s} {'AND' if wc_s else 'WHERE'} status IS NOT NULL", p_s)
            statuses.update(row['status'] for row in cur.fetchall())

        if _table_exists(conn, 'icsr_consultancy_projects'):
            wc_d, p_d = _build_project_filters(None, project_year, status, 'department')
            cur.execute(f"SELECT DISTINCT department AS dept FROM icsr_consultancy_projects {wc_d} {'AND' if wc_d else 'WHERE'} department IS NOT NULL", p_d)
            depts.update(row['dept'] for row in cur.fetchall())
            wc_y, p_y = _build_project_filters(department, None, status, 'department')
            cur.execute(f"SELECT DISTINCT EXTRACT(YEAR FROM COALESCE(start_date, end_date))::INT AS year FROM icsr_consultancy_projects {wc_y} {'AND' if wc_y else 'WHERE'} (start_date IS NOT NULL OR end_date IS NOT NULL)", p_y)
            years.update(int(row['year']) for row in cur.fetchall() if row['year'] is not None)
            wc_s, p_s = _build_project_filters(department, project_year, None, 'department')
            cur.execute(f"SELECT DISTINCT status FROM icsr_consultancy_projects {wc_s} {'AND' if wc_s else 'WHERE'} status IS NOT NULL", p_s)
            statuses.update(row['status'] for row in cur.fetchall())

        filters['project_departments'] = sorted(depts)
        filters['project_years'] = sorted(years, reverse=True)
        filters['project_statuses'] = sorted(statuses)
        filters['project_types'] = ['Sponsored', 'Consultancy']

        if _table_exists(conn, 'research_mous'):
            cur.execute("SELECT DISTINCT EXTRACT(YEAR FROM date_signed)::INT AS year FROM research_mous ORDER BY year DESC")
            filters['mou_years'] = [int(row['year']) for row in cur.fetchall() if row['year'] is not None]

        if _table_exists(conn, 'research_patents'):
            # Patent years: filter by patent_status
            py_cond = "WHERE patent_status = %s AND filing_date IS NOT NULL" if patent_status else "WHERE filing_date IS NOT NULL"
            py_params = [patent_status] if patent_status else []
            cur.execute(f"SELECT DISTINCT EXTRACT(YEAR FROM filing_date)::INT AS year FROM research_patents {py_cond} ORDER BY year DESC", py_params)
            filters['patent_years'] = [int(row['year']) for row in cur.fetchall() if row['year'] is not None]

            # Patent statuses: filter by patent_year
            ps_cond = "WHERE EXTRACT(YEAR FROM filing_date)::INT = %s AND patent_status IS NOT NULL" if patent_year else "WHERE patent_status IS NOT NULL"
            ps_params = [int(patent_year)] if patent_year else []
            cur.execute(f"SELECT DISTINCT patent_status FROM research_patents {ps_cond} ORDER BY patent_status", ps_params)
            filters['patent_statuses'] = [row['patent_status'] for row in cur.fetchall()]

        if _table_exists(conn, 'research_publications'):
            # Publication departments: filter by pub_year + pub_type
            pub_d_wc, pub_d_p = _build_publication_filters(None, publication_year, publication_type)
            cur.execute(f"SELECT DISTINCT department FROM research_publications {pub_d_wc} {'AND' if pub_d_wc else 'WHERE'} department IS NOT NULL ORDER BY department", pub_d_p)
            filters['publication_departments'] = [row['department'] for row in cur.fetchall()]

            # Publication years: filter by dept + pub_type
            pub_y_wc, pub_y_p = _build_publication_filters(department, None, publication_type)
            cur.execute(f"SELECT DISTINCT publication_year FROM research_publications {pub_y_wc} {'AND' if pub_y_wc else 'WHERE'} publication_year IS NOT NULL ORDER BY publication_year DESC", pub_y_p)
            filters['publication_years'] = [int(row['publication_year']) for row in cur.fetchall() if row['publication_year'] is not None]

            # Publication types: filter by dept + pub_year
            pub_t_wc, pub_t_p = _build_publication_filters(department, publication_year, None)
            cur.execute(f"SELECT DISTINCT publication_type FROM research_publications {pub_t_wc} {'AND' if pub_t_wc else 'WHERE'} publication_type IS NOT NULL ORDER BY publication_type", pub_t_p)
            filters['publication_types'] = [row['publication_type'] for row in cur.fetchall()]

        if _table_exists(conn, 'externship_info'):
            cur.execute("SELECT DISTINCT EXTRACT(YEAR FROM startdate)::INT AS year FROM externship_info WHERE startdate IS NOT NULL ORDER BY year DESC")
            filters['externship_years'] = [int(row['year']) for row in cur.fetchall() if row['year'] is not None]
            cur.execute("SELECT DISTINCT department FROM externship_info WHERE department IS NOT NULL ORDER BY department")
            filters['externship_departments'] = [row['department'] for row in cur.fetchall()]

        return jsonify(filters)
    except Exception as exc:
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@research_bp.route('/summary', methods=['GET'])
@token_optional
def get_summary(current_user_id):
    conn = None
    cur = None
    try:
        department = request.args.get('department')
        project_year = request.args.get('project_year')
        status = request.args.get('status')
        project_type = request.args.get('project_type')

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        funded_total = 0
        consultancy_total = 0
        total_sanctioned_revenue = 0.0
        total_projects = 0

        # Count funded (sponsored) projects
        if _table_exists(conn, 'icsr_sponsered_projects') and project_type in (None, '', 'All', 'Sponsored'):
            where_clause, params = _build_project_filters(
                department, project_year, status, dept_column='principal_investigator_department'
            )
            cur.execute(
                f"SELECT COUNT(*) AS total, SUM(amount_sanctioned) AS amount FROM icsr_sponsered_projects {where_clause}",
                params,
            )
            row = cur.fetchone()
            if row:
                funded_total = int(row['total'] or 0)
                total_projects += funded_total
                amount_value = row.get('amount')
                if amount_value is not None:
                    total_sanctioned_revenue += _decimal_to_float(amount_value)


        # Count consultancy projects
        if _table_exists(conn, 'icsr_consultancy_projects') and project_type in (None, '', 'All', 'Consultancy'):
            where_clause, params = _build_project_filters(
                department, project_year, status, dept_column='department'
            )
            cur.execute(
                f"SELECT COUNT(*) AS total, SUM(amount_sanctioned) AS amount FROM icsr_consultancy_projects {where_clause}",
                params,
            )
            row = cur.fetchone()
            if row:
                consultancy_total = int(row['total'] or 0)
                amount_value = row.get('amount')
                if amount_value is not None:
                    total_sanctioned_revenue += _decimal_to_float(amount_value)
                total_projects += consultancy_total

        total_mous = 0
        if _table_exists(conn, 'research_mous'):
            mou_where, mou_params = _build_year_filter('date_signed', project_year)
            cur.execute(
                f"SELECT COUNT(*) AS total FROM research_mous {mou_where}",
                mou_params,
            )
            total_mous = cur.fetchone()['total']

        status_keys = ['Filed', 'Granted', 'Published']
        patent_breakdown = {key: 0 for key in status_keys}
        total_patents = 0
        if _table_exists(conn, 'research_patents'):
            patent_where, patent_params = _build_patent_filters(project_year, None)
            cur.execute(
                f"""
                SELECT patent_status, COUNT(*) AS total
                FROM research_patents
                {patent_where}
                GROUP BY patent_status
                """,
                patent_params,
            )
            for row in cur.fetchall():
                status_value = row['patent_status']
                count = row['total']
                patent_breakdown[status_value] = count
                total_patents += count

        summary = {
            'funded_projects': funded_total,
            'consultancy_projects': consultancy_total,
            'sanctioned_projects': total_projects,
            'total_projects': total_projects,
            'total_mous': total_mous,
            'total_patents': total_patents,
            'patent_breakdown': patent_breakdown,
            'total_sanctioned_revenue': total_sanctioned_revenue,
        }
        return jsonify(summary)
    except Exception as exc:
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@research_bp.route('/projects/trend', methods=['GET'])
@token_optional
def funded_project_trend(current_user_id):
    """Return yearly project counts from both sponsored and consultancy tables."""
    conn = None
    cur = None
    try:
        department = request.args.get('department')
        project_year = request.args.get('project_year')
        status = request.args.get('status')
        project_type = request.args.get('project_type')

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        yearly: Dict[int, Dict[str, int]] = defaultdict(lambda: {'funded': 0, 'consultancy': 0})

        # Sponsored (funded) projects
        if _table_exists(conn, 'icsr_sponsered_projects') and project_type in (None, '', 'All', 'Sponsored'):
            wc, p = _build_project_filters(department, project_year, status, dept_column='principal_investigator_department')
            if wc:
                wc += " AND COALESCE(start_date, end_date) IS NOT NULL"
            else:
                wc = "WHERE COALESCE(start_date, end_date) IS NOT NULL"
            cur.execute(
                f"SELECT EXTRACT(YEAR FROM COALESCE(start_date, end_date))::INT AS year, COUNT(*) AS total FROM icsr_sponsered_projects {wc} GROUP BY year",
                p,
            )
            for row in cur.fetchall():
                if row['year'] is not None:
                    yearly[int(row['year'])]['funded'] = int(row['total'])

        # Consultancy projects
        if _table_exists(conn, 'icsr_consultancy_projects') and project_type in (None, '', 'All', 'Consultancy'):
            wc, p = _build_project_filters(department, project_year, status, dept_column='department')
            if wc:
                wc += " AND COALESCE(start_date, end_date) IS NOT NULL"
            else:
                wc = "WHERE COALESCE(start_date, end_date) IS NOT NULL"
            cur.execute(
                f"SELECT EXTRACT(YEAR FROM COALESCE(start_date, end_date))::INT AS year, COUNT(*) AS total FROM icsr_consultancy_projects {wc} GROUP BY year",
                p,
            )
            for row in cur.fetchall():
                if row['year'] is not None:
                    yearly[int(row['year'])]['consultancy'] = int(row['total'])

        data = [
            {'year': y, 'funded': yearly[y]['funded'], 'consultancy': yearly[y]['consultancy']}
            for y in sorted(yearly.keys())
        ]
        return jsonify({'data': data}), 200
    except Exception as exc:
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@research_bp.route('/projects/list', methods=['GET'])
@token_optional
def project_list(current_user_id):
    conn = None
    cur = None
    try:
        department = request.args.get('department')
        project_year = request.args.get('project_year')
        status = request.args.get('status')
        project_type = request.args.get('project_type')

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        rows = []

        # Fetch funded (sponsored) projects
        if _table_exists(conn, 'icsr_sponsered_projects') and project_type in (None, '', 'All', 'Sponsored'):
            where_clause, params = _build_project_filters(
                department, project_year, status, dept_column='principal_investigator_department'
            )
            cur.execute(
                f"""
                SELECT project_id, project_title, principal_investigator,
                       principal_investigator_department AS department,
                       'Sponsored' AS project_type,
                       funding_agency, client_organization,
                       amount_sanctioned, start_date, end_date, status
                FROM icsr_sponsered_projects
                {where_clause}
                """,
                params,
            )
            for row in cur.fetchall():
                rows.append({
                    'project_id': row['project_id'],
                    'project_title': row['project_title'],
                    'principal_investigator': row['principal_investigator'],
                    'department': row['department'],
                    'project_type': row['project_type'],
                    'funding_agency': row['funding_agency'],
                    'client_organization': row['client_organization'],
                    'amount_sanctioned': _decimal_to_float(row['amount_sanctioned']),
                    'start_date': _serialize_date(row['start_date']),
                    'end_date': _serialize_date(row['end_date']),
                    'status': row['status'],
                })

        # Fetch consultancy projects
        if _table_exists(conn, 'icsr_consultancy_projects') and project_type in (None, '', 'All', 'Consultancy'):
            where_clause, params = _build_project_filters(
                department, project_year, status, dept_column='department'
            )
            cur.execute(
                f"""
                SELECT project_id, project_title, principal_investigator,
                       department,
                       'Consultancy' AS project_type,
                       funding_agency, client_organization,
                       amount_sanctioned, start_date, end_date, status
                FROM icsr_consultancy_projects
                {where_clause}
                """,
                params,
            )
            for row in cur.fetchall():
                rows.append({
                    'project_id': row['project_id'],
                    'project_title': row['project_title'],
                    'principal_investigator': row['principal_investigator'],
                    'department': row['department'],
                    'project_type': row['project_type'],
                    'funding_agency': row['funding_agency'],
                    'client_organization': row['client_organization'],
                    'amount_sanctioned': _decimal_to_float(row['amount_sanctioned']),
                    'start_date': _serialize_date(row['start_date']),
                    'end_date': _serialize_date(row['end_date']),
                    'status': row['status'],
                })

        # Sort combined results
        rows.sort(key=lambda r: (r['start_date'] or r['end_date'] or '', r['project_title'] or ''), reverse=True)
        return jsonify({'data': rows})
    except Exception as exc:
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@research_bp.route('/consultancy/revenue-trend', methods=['GET'])
@token_optional
def consultancy_revenue_trend(current_user_id):
    """Return yearly revenue from both sponsored and consultancy tables."""
    conn = None
    cur = None
    try:
        department = request.args.get('department')
        project_year = request.args.get('project_year')
        status = request.args.get('status')

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        yearly: Dict[int, Dict[str, float]] = defaultdict(lambda: {'funded_revenue': 0.0, 'consultancy_revenue': 0.0})

        # Sponsored (funded) revenue
        if _table_exists(conn, 'icsr_sponsered_projects'):
            wc, p = _build_project_filters(department, project_year, status, dept_column='principal_investigator_department')
            if wc:
                wc += " AND COALESCE(start_date, end_date) IS NOT NULL"
            else:
                wc = "WHERE COALESCE(start_date, end_date) IS NOT NULL"
            cur.execute(
                f"SELECT EXTRACT(YEAR FROM COALESCE(start_date, end_date))::INT AS year, COALESCE(SUM(amount_sanctioned), 0) AS revenue FROM icsr_sponsered_projects {wc} GROUP BY year",
                p,
            )
            for row in cur.fetchall():
                if row['year'] is not None:
                    yearly[int(row['year'])]['funded_revenue'] = _decimal_to_float(row['revenue'])

        # Consultancy revenue
        if _table_exists(conn, 'icsr_consultancy_projects'):
            wc, p = _build_project_filters(department, project_year, status, dept_column='department')
            if wc:
                wc += " AND COALESCE(start_date, end_date) IS NOT NULL"
            else:
                wc = "WHERE COALESCE(start_date, end_date) IS NOT NULL"
            cur.execute(
                f"SELECT EXTRACT(YEAR FROM COALESCE(start_date, end_date))::INT AS year, COALESCE(SUM(amount_sanctioned), 0) AS revenue FROM icsr_consultancy_projects {wc} GROUP BY year",
                p,
            )
            for row in cur.fetchall():
                if row['year'] is not None:
                    yearly[int(row['year'])]['consultancy_revenue'] = _decimal_to_float(row['revenue'])

        data = [
            {'year': y, 'funded_revenue': yearly[y]['funded_revenue'], 'consultancy_revenue': yearly[y]['consultancy_revenue']}
            for y in sorted(yearly.keys())
        ]
        return jsonify({'data': data}), 200
    except Exception as exc:
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@research_bp.route('/mous/list', methods=['GET'])
@token_optional
def mou_list(current_user_id):
    conn = None
    cur = None
    try:
        mou_year = request.args.get('mou_year')

        conn = get_db_connection()
        if not _table_exists(conn, 'research_mous'):
            return jsonify({'data': []})

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        where_clause, params = _build_year_filter('date_signed', mou_year)

        query = f"""
            SELECT mou_id,
                   partner_name,
                   collaboration_nature,
                   date_signed,
                   validity_end,
                   remarks
            FROM research_mous
            {where_clause}
            ORDER BY date_signed DESC NULLS LAST, partner_name
        """
        cur.execute(query, params)
        rows = []
        for row in cur.fetchall():
            rows.append({
                'mou_id': row['mou_id'],
                'partner_name': row['partner_name'],
                'collaboration_nature': row['collaboration_nature'],
                'date_signed': _serialize_date(row['date_signed']),
                'validity_end': _serialize_date(row['validity_end']),
                'remarks': row['remarks'],
            })
        return jsonify({'data': rows})
    except Exception as exc:
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@research_bp.route('/mous/trend', methods=['GET'])
@token_optional
def mou_trend(current_user_id):
    conn = None
    cur = None
    try:
        mou_year = request.args.get('mou_year')
        
        conn = get_db_connection()
        if not _table_exists(conn, 'research_mous'):
            return jsonify({'data': []}), 200

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        where_clause, params = _build_year_filter('date_signed', mou_year)
        
        # If no where clause, we still need the 'WHERE date_signed IS NOT NULL'
        if not where_clause:
            where_clause = "WHERE date_signed IS NOT NULL"
        else:
            where_clause += " AND date_signed IS NOT NULL"

        cur.execute(
            f"""
            SELECT
                EXTRACT(YEAR FROM date_signed)::INT AS year,
                COUNT(*) AS total
            FROM research_mous
            {where_clause}
            GROUP BY year
            ORDER BY year
            """,
            params
        )
        data = [
            {'year': int(row['year']), 'total': int(row['total'])}
            for row in cur.fetchall()
        ]
        return jsonify({'data': data}), 200
    except Exception as exc:
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@research_bp.route('/patents/stats', methods=['GET'])
@token_optional
def patent_stats(current_user_id):
    conn = None
    cur = None
    try:
        patent_year = request.args.get('patent_year')
        patent_status = request.args.get('patent_status')

        conn = get_db_connection()
        if not _table_exists(conn, 'research_patents'):
            return jsonify({'overall': {}, 'yearly': []})

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        # Filed: count all patents grouped by filing_date year
        filed_conditions = ["filing_date IS NOT NULL"]
        filed_params: List[Any] = []
        if patent_year and patent_year != 'All':
            try:
                filed_conditions.append("EXTRACT(YEAR FROM filing_date)::INT = %s")
                filed_params.append(int(patent_year))
            except ValueError:
                pass
        if patent_status and patent_status != 'All':
            filed_conditions.append("patent_status = %s")
            filed_params.append(patent_status)
        filed_where = "WHERE " + " AND ".join(filed_conditions)

        cur.execute(f"""
            SELECT EXTRACT(YEAR FROM filing_date)::INT AS year, COUNT(*) AS total
            FROM research_patents
            {filed_where}
            GROUP BY year ORDER BY year
        """, filed_params)
        filed_rows = cur.fetchall()

        # Granted: count patents with status='Granted' grouped by grant_date year
        granted_conditions = ["patent_status = 'Granted'", "grant_date IS NOT NULL"]
        granted_params: List[Any] = []
        if patent_year and patent_year != 'All':
            try:
                granted_conditions.append("EXTRACT(YEAR FROM grant_date::date)::INT = %s")
                granted_params.append(int(patent_year))
            except ValueError:
                pass
        granted_where = "WHERE " + " AND ".join(granted_conditions)

        cur.execute(f"""
            SELECT EXTRACT(YEAR FROM grant_date::date)::INT AS year, COUNT(*) AS total
            FROM research_patents
            {granted_where}
            GROUP BY year ORDER BY year
        """, granted_params)
        granted_rows = cur.fetchall()

        yearly_map: Dict[int, Dict[str, int]] = defaultdict(lambda: {'Filed': 0, 'Granted': 0})
        for row in filed_rows:
            if row['year'] is not None:
                yearly_map[int(row['year'])]['Filed'] = int(row['total'])
        for row in granted_rows:
            if row['year'] is not None:
                yearly_map[int(row['year'])]['Granted'] = int(row['total'])

        yearly = [
            {'year': y, 'Filed': yearly_map[y]['Filed'], 'Granted': yearly_map[y]['Granted']}
            for y in sorted(yearly_map.keys())
        ]
        overall_counts = {
            'Filed': sum(e['Filed'] for e in yearly),
            'Granted': sum(e['Granted'] for e in yearly),
        }

        return jsonify({'overall': overall_counts, 'yearly': yearly}), 200
    except Exception as exc:
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@research_bp.route('/patents/list', methods=['GET'])
@token_optional
def patent_list(current_user_id):
    conn = None
    cur = None
    try:
        patent_year = request.args.get('patent_year')
        patent_status = request.args.get('patent_status')

        conn = get_db_connection()
        if not _table_exists(conn, 'research_patents'):
            return jsonify({'data': []})

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        where_clause, params = _build_patent_filters(patent_year, patent_status)

        query = f"""
            SELECT patent_id,
                   patent_title,
                   inventor1, inventor1_category,
                   inventor2, inventor2_category,
                   inventor3, inventor3_category,
                   inventor4, inventor4_category,
                   patent_status,
                   filing_date,
                   grant_date,
                   remarks
            FROM research_patents
            {where_clause}
            ORDER BY COALESCE(grant_date::date, filing_date) DESC NULLS LAST, patent_title
        """
        cur.execute(query, params)
        rows = []
        for row in cur.fetchall():
            # Build a combined inventors string from individual inventor columns
            inventors_list = [row[f'inventor{i}'] for i in range(1, 5) if row.get(f'inventor{i}')]
            rows.append({
                'patent_id': row['patent_id'],
                'patent_title': row['patent_title'],
                'inventors': ', '.join(inventors_list),
                'inventor1': row.get('inventor1'),
                'inventor1_category': row.get('inventor1_category'),
                'inventor2': row.get('inventor2'),
                'inventor2_category': row.get('inventor2_category'),
                'inventor3': row.get('inventor3'),
                'inventor3_category': row.get('inventor3_category'),
                'inventor4': row.get('inventor4'),
                'inventor4_category': row.get('inventor4_category'),
                'patent_status': row['patent_status'],
                'filing_date': _serialize_date(row['filing_date']),
                'grant_date': _serialize_date(row['grant_date']),
                'remarks': row['remarks'],
            })
        return jsonify({'data': rows})
    except Exception as exc:
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@research_bp.route('/externships/analytics', methods=['GET'])
@token_optional
def externship_analytics(current_user_id):
    """Combined summary and list data for externships to reduce API calls."""
    conn = None
    cur = None
    try:
        department = request.args.get('department')
        year = request.args.get('externship_year')

        conn = get_db_connection()
        if not _table_exists(conn, 'externship_info'):
            return jsonify({'total': 0, 'yearly': [], 'department': [], 'data': []})

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        conditions: List[str] = []
        params: List[Any] = []

        if department and department != 'All':
            conditions.append("department = %s")
            params.append(department)

        if year and year != 'All':
            try:
                year_int = int(year)
                conditions.append("EXTRACT(YEAR FROM startdate)::INT = %s")
                params.append(year_int)
            except ValueError:
                pass

        where_clause = ""
        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)

        # 1. Fetch Summary Data
        query_yearly = f"""
            SELECT
                EXTRACT(YEAR FROM startdate)::INT AS year,
                "type" AS externship_type,
                COUNT(*) AS total
            FROM externship_info
            {where_clause}
            GROUP BY year, "type"
            ORDER BY year
        """
        cur.execute(query_yearly, params)
        yearly_map = defaultdict(lambda: defaultdict(int))
        total_externships = 0
        for row in cur.fetchall():
            y_val = row['year']
            if y_val is None: continue
            ext_type = row['externship_type'] or 'Unknown'
            count = int(row['total'])
            yearly_map[y_val][ext_type] += count
            yearly_map[y_val]['total'] += count
            total_externships += count

        yearly_data = []
        for y_val in sorted(yearly_map.keys()):
            entry = {'year': int(y_val), 'total': int(yearly_map[y_val]['total'])}
            for key, val in yearly_map[y_val].items():
                if key != 'total': entry[key] = int(val)
            yearly_data.append(entry)

        query_dept = f'SELECT department, COUNT(*) AS total FROM externship_info {where_clause} GROUP BY department ORDER BY total DESC'
        cur.execute(query_dept, params)
        dept_data = [{'department': r['department'], 'total': int(r['total'])} for r in cur.fetchall()]

        # 2. Fetch List Data
        query_list = f"""
            SELECT
                externid AS externship_id, empname AS faculty_name,
                department, industry_name, "type" AS externship_type,
                startdate, enddate,
                CASE WHEN enddate IS NOT NULL THEN (enddate - startdate) ELSE NULL END AS duration_days
            FROM externship_info
            {where_clause}
            ORDER BY startdate DESC NULLS LAST, empname
        """
        cur.execute(query_list, params)
        list_data = []
        for row in cur.fetchall():
            list_data.append({
                'externship_id': row['externship_id'],
                'faculty_name': row['faculty_name'],
                'department': row['department'],
                'industry_name': row['industry_name'],
                'type': row['externship_type'],
                'startdate': _serialize_date(row['startdate']),
                'enddate': _serialize_date(row['enddate']),
                'duration_days': int(row['duration_days']) if row['duration_days'] is not None else None,
            })

        return jsonify({
            'total': int(total_externships),
            'yearly': yearly_data,
            'department': dept_data,
            'data': list_data
        })
    except Exception as exc:
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur: cur.close()
        if conn: release_db_connection(conn)


@research_bp.route('/externships/summary', methods=['GET'])
@token_optional
def externship_summary(current_user_id):
    # Keep for backward compatibility, but we should use /analytics
    return externship_analytics(current_user_id)


@research_bp.route('/externships/list', methods=['GET'])
@token_optional
def externship_list(current_user_id):
    # Keep for backward compatibility
    return externship_analytics(current_user_id)


@research_bp.route('/publications/summary', methods=['GET'])
@token_optional
def publication_summary(current_user_id):
    conn = None
    cur = None
    try:
        department = request.args.get('department')
        publication_year = request.args.get('publication_year')
        publication_type = request.args.get('publication_type')

        conn = get_db_connection()
        if not _table_exists(conn, 'research_publications'):
            return jsonify({'total': 0, 'by_type': {}, 'latest_year': None})

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        where_clause, params = _build_publication_filters(department, publication_year, publication_type)

        query_total = f"""
            SELECT COUNT(*) AS total FROM research_publications {where_clause}
        """
        cur.execute(query_total, params)
        total = cur.fetchone()['total']

        query_type = f"""
            SELECT publication_type, COUNT(*) AS total
            FROM research_publications
            {where_clause}
            GROUP BY publication_type
        """
        cur.execute(query_type, params)
        by_type = {row['publication_type']: row['total'] for row in cur.fetchall()}

        # Count journal and conference by checking if lowercased publication_type
        # contains the keyword 'journal' or 'conference'
        journal_count = 0
        conference_count = 0
        for pub_type, count in by_type.items():
            if pub_type is None:
                continue
            words = pub_type.lower().split()
            temp = pub_type.lower().split('-')
            for t in temp: 
                words.append(t)
                
            if 'journal' in words:
                journal_count += count
            if 'conference' in words:
                conference_count += count

        cur.execute(
            f"""
            SELECT MAX(publication_year) AS latest_year
            FROM research_publications
            {where_clause}
            """
        , params)
        latest_year = cur.fetchone()['latest_year']

        return jsonify({
            'total': total,
            'by_type': by_type,
            'latest_year': latest_year,
            'journal_count': journal_count,
            'conference_count': conference_count
        })
    except Exception as exc:
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@research_bp.route('/publications/trend', methods=['GET'])
@token_optional
def publication_trend(current_user_id):
    conn = None
    cur = None
    try:
        department = request.args.get('department')
        publication_type = request.args.get('publication_type')

        conn = get_db_connection()
        if not _table_exists(conn, 'research_publications'):
            return jsonify({'data': []})

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        where_clause, params = _build_publication_filters(department, None, publication_type)

        query = f"""
            SELECT publication_year AS year,
                   COUNT(*) AS total
            FROM research_publications
            {where_clause}
            GROUP BY publication_year
            ORDER BY publication_year
        """
        cur.execute(query, params)
        data = [{'year': row['year'], 'total': row['total']} for row in cur.fetchall()]
        return jsonify({'data': data})
    except Exception as exc:
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@research_bp.route('/publications/department', methods=['GET'])
@token_optional
def publication_by_department(current_user_id):
    conn = None
    cur = None
    try:
        publication_year = request.args.get('publication_year')
        publication_type = request.args.get('publication_type')

        conn = get_db_connection()
        if not _table_exists(conn, 'research_publications'):
            return jsonify({'data': []})

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        where_clause, params = _build_publication_filters(None, publication_year, publication_type)

        query = f"""
            SELECT COALESCE(department, 'Unspecified') AS department,
                   COUNT(*) AS total
            FROM research_publications
            {where_clause}
            GROUP BY COALESCE(department, 'Unspecified')
            ORDER BY total DESC
        """
        cur.execute(query, params)
        data = [{'department': row['department'], 'total': row['total']} for row in cur.fetchall()]
        return jsonify({'data': data})
    except Exception as exc:
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@research_bp.route('/publications/type-distribution', methods=['GET'])
@token_optional
def publication_type_distribution(current_user_id):
    conn = None
    cur = None
    try:
        department = request.args.get('department')
        publication_year = request.args.get('publication_year')

        conn = get_db_connection()
        if not _table_exists(conn, 'research_publications'):
            return jsonify({'data': []})

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        where_clause, params = _build_publication_filters(department, publication_year, None)

        query = f"""
            SELECT publication_type, COUNT(*) AS total
            FROM research_publications
            {where_clause}
            GROUP BY publication_type
        """
        cur.execute(query, params)
        data = [{'publication_type': row['publication_type'], 'total': row['total']} for row in cur.fetchall()]
        return jsonify({'data': data})
    except Exception as exc:
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@research_bp.route('/publications/list', methods=['GET'])
@token_optional
def publication_list(current_user_id):
    conn = None
    cur = None
    try:
        department = request.args.get('department')
        publication_year = request.args.get('publication_year')
        publication_type = request.args.get('publication_type')

        conn = get_db_connection()
        if not _table_exists(conn, 'research_publications'):
            return jsonify({'data': []})

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        where_clause, params = _build_publication_filters(department, publication_year, publication_type)

        query = f"""
            SELECT id,
                   publication_title,
                   journal_name,
                   department,
                   faculty_name,
                   publication_year,
                   publication_type
            FROM research_publications
            {where_clause}
            ORDER BY publication_year DESC, publication_title
        """
        cur.execute(query, params)
        data = []
        for row in cur.fetchall():
            data.append({
                'publication_id': row['id'],
                'publication_title': row['publication_title'],
                'journal_name': row['journal_name'],
                'department': row['department'],
                'faculty_name': row['faculty_name'],
                'publication_year': row['publication_year'],
                'publication_type': row['publication_type'],
            })
        return jsonify({'data': data})
    except Exception as exc:
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)