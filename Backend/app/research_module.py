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

from .auth import token_required
from .db import get_db_connection


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
                "EXTRACT(YEAR FROM COALESCE(grant_date::date, filing_date))::INT = %s"
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
@token_required
def get_filter_options(current_user_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
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

        # Collect project departments from both icsr tables
        depts = set()
        years = set()
        statuses = set()

        if _table_exists(conn, 'icsr_sponsered_projects'):
            cur.execute(
                "SELECT DISTINCT principal_investigator_department AS dept FROM icsr_sponsered_projects WHERE principal_investigator_department IS NOT NULL"
            )
            depts.update(row['dept'] for row in cur.fetchall())
            cur.execute(
                "SELECT DISTINCT EXTRACT(YEAR FROM COALESCE(start_date, end_date))::INT AS year FROM icsr_sponsered_projects WHERE start_date IS NOT NULL OR end_date IS NOT NULL"
            )
            years.update(int(row['year']) for row in cur.fetchall() if row['year'] is not None)
            cur.execute("SELECT DISTINCT status FROM icsr_sponsered_projects WHERE status IS NOT NULL")
            statuses.update(row['status'] for row in cur.fetchall())

        if _table_exists(conn, 'icsr_consultancy_projects'):
            cur.execute(
                "SELECT DISTINCT department AS dept FROM icsr_consultancy_projects WHERE department IS NOT NULL"
            )
            depts.update(row['dept'] for row in cur.fetchall())
            cur.execute(
                "SELECT DISTINCT EXTRACT(YEAR FROM COALESCE(start_date, end_date))::INT AS year FROM icsr_consultancy_projects WHERE start_date IS NOT NULL OR end_date IS NOT NULL"
            )
            years.update(int(row['year']) for row in cur.fetchall() if row['year'] is not None)
            cur.execute("SELECT DISTINCT status FROM icsr_consultancy_projects WHERE status IS NOT NULL")
            statuses.update(row['status'] for row in cur.fetchall())

        filters['project_departments'] = sorted(depts)
        filters['project_years'] = sorted(years, reverse=True)
        filters['project_statuses'] = sorted(statuses)
        filters['project_types'] = ['Funded', 'Consultancy']  # Fixed list — each table is a type

        if _table_exists(conn, 'research_mous'):
            cur.execute(
                """
                SELECT DISTINCT EXTRACT(YEAR FROM date_signed)::INT AS year
                FROM research_mous
                ORDER BY year DESC
                """
            )
            filters['mou_years'] = [int(row['year']) for row in cur.fetchall() if row['year'] is not None]

        if _table_exists(conn, 'research_patents'):
            cur.execute(
                """
                SELECT DISTINCT EXTRACT(YEAR FROM COALESCE(grant_date::date, filing_date))::INT AS year
                FROM research_patents
                WHERE filing_date IS NOT NULL OR grant_date IS NOT NULL
                ORDER BY year DESC
                """
            )
            filters['patent_years'] = [int(row['year']) for row in cur.fetchall() if row['year'] is not None]

            cur.execute(
                "SELECT DISTINCT patent_status FROM research_patents ORDER BY patent_status"
            )
            filters['patent_statuses'] = [row['patent_status'] for row in cur.fetchall()]

        if _table_exists(conn, 'research_publications'):
            cur.execute(
                "SELECT DISTINCT department FROM research_publications WHERE department IS NOT NULL ORDER BY department"
            )
            filters['publication_departments'] = [row['department'] for row in cur.fetchall()]

            cur.execute(
                "SELECT DISTINCT publication_year FROM research_publications ORDER BY publication_year DESC"
            )
            filters['publication_years'] = [
                int(row['publication_year']) for row in cur.fetchall() if row['publication_year'] is not None
            ]

            cur.execute(
                "SELECT DISTINCT publication_type FROM research_publications ORDER BY publication_type"
            )
            filters['publication_types'] = [row['publication_type'] for row in cur.fetchall()]

        if _table_exists(conn, 'externship_info'):
            cur.execute(
                """
                SELECT DISTINCT EXTRACT(YEAR FROM startdate)::INT AS year
                FROM externship_info
                WHERE startdate IS NOT NULL
                ORDER BY year DESC
                """
            )
            filters['externship_years'] = [int(row['year']) for row in cur.fetchall() if row['year'] is not None]
            
            cur.execute(
                """
                SELECT DISTINCT department
                FROM externship_info
                WHERE department IS NOT NULL
                ORDER BY department
                """
            )
            filters['externship_departments'] = [row['department'] for row in cur.fetchall()]

        return jsonify(filters)
    except Exception as exc:
        return jsonify({'message': f'Failed to fetch research filter options: {exc}'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@research_bp.route('/summary', methods=['GET'])
@token_required
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
        if _table_exists(conn, 'icsr_sponsered_projects') and project_type in (None, '', 'All', 'Funded'):
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
        return jsonify({'message': f'Failed to fetch research summary: {exc}'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@research_bp.route('/projects/trend', methods=['GET'])
@token_required
def funded_project_trend(current_user_id):
    """Return yearly project counts from both sponsored and consultancy tables."""
    conn = None
    cur = None
    try:
        department = request.args.get('department')
        project_year = request.args.get('project_year')
        status = request.args.get('status')

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        yearly: Dict[int, Dict[str, int]] = defaultdict(lambda: {'funded': 0, 'consultancy': 0})

        # Sponsored (funded) projects
        if _table_exists(conn, 'icsr_sponsered_projects'):
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
        if _table_exists(conn, 'icsr_consultancy_projects'):
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
        return jsonify({'message': f'Failed to fetch project trend: {exc}'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@research_bp.route('/projects/list', methods=['GET'])
@token_required
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
        if _table_exists(conn, 'icsr_sponsered_projects') and project_type in (None, '', 'All', 'Funded'):
            where_clause, params = _build_project_filters(
                department, project_year, status, dept_column='principal_investigator_department'
            )
            cur.execute(
                f"""
                SELECT project_id, project_title, principal_investigator,
                       principal_investigator_department AS department,
                       'Funded' AS project_type,
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
        return jsonify({'message': f'Failed to fetch projects: {exc}'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@research_bp.route('/consultancy/revenue-trend', methods=['GET'])
@token_required
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
        return jsonify({'message': f'Failed to fetch revenue trend: {exc}'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@research_bp.route('/mous/list', methods=['GET'])
@token_required
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
        return jsonify({'message': f'Failed to fetch MoUs: {exc}'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@research_bp.route('/mous/trend', methods=['GET'])
@token_required
def mou_trend(current_user_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not _table_exists(conn, 'research_mous'):
            return jsonify({'data': []}), 200

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        cur.execute(
            """
            SELECT
                EXTRACT(YEAR FROM date_signed)::INT AS year,
                COUNT(*) AS total
            FROM research_mous
            WHERE date_signed IS NOT NULL
            GROUP BY year
            ORDER BY year
            """
        )
        data = [
            {'year': int(row['year']), 'total': int(row['total'])}
            for row in cur.fetchall()
        ]
        return jsonify({'data': data}), 200
    except Exception as exc:
        return jsonify({'message': f'Failed to fetch MoU trend: {exc}'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@research_bp.route('/patents/stats', methods=['GET'])
@token_required
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
        where_clause, params = _build_patent_filters(patent_year, patent_status)

        query = f"""
            SELECT
                EXTRACT(YEAR FROM COALESCE(grant_date::date, filing_date))::INT AS year,
                patent_status,
                COUNT(*) AS total
            FROM research_patents
            {where_clause}
            GROUP BY year, patent_status
            ORDER BY year
        """
        cur.execute(query, params)
        status_keys = ['Filed', 'Granted', 'Published']
        yearly_map: Dict[int, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        overall_counts = {key: 0 for key in status_keys}
        for row in cur.fetchall():
            year = row['year']
            if year is None:
                continue
            status_value = row['patent_status']
            total = int(row['total'])
            yearly_map[year][status_value] += total
            if status_value in overall_counts:
                overall_counts[status_value] += total
            else:
                overall_counts[status_value] = total

        yearly = []
        for year in sorted(yearly_map.keys()):
            entry = {'year': int(year)}
            for status_key in status_keys:
                entry[status_key] = yearly_map[year].get(status_key, 0)
            entry['total'] = sum(entry[status_key] for status_key in status_keys)
            yearly.append(entry)

        return jsonify({'overall': overall_counts, 'yearly': yearly}), 200
    except Exception as exc:
        return jsonify({'message': f'Failed to fetch patent stats: {exc}'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@research_bp.route('/patents/list', methods=['GET'])
@token_required
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
        return jsonify({'message': f'Failed to fetch patents: {exc}'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@research_bp.route('/externships/summary', methods=['GET'])
@token_required
def externship_summary(current_user_id):
    conn = None
    cur = None
    try:
        department = request.args.get('department')
        year = request.args.get('externship_year')

        conn = get_db_connection()
        if not _table_exists(conn, 'externship_info'):
            return jsonify({'total': 0, 'yearly': [], 'department': []})

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
        yearly_map: Dict[int, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        total_externships = 0
        for row in cur.fetchall():
            year_value = row['year']
            if year_value is None:
                continue
            ext_type = row['externship_type'] or 'Unknown'
            count = int(row['total'])
            yearly_map[year_value][ext_type] += count
            yearly_map[year_value]['total'] += count
            total_externships += count

        yearly_data = []
        for year_value in sorted(yearly_map.keys()):
            entry = {'year': int(year_value), 'total': int(yearly_map[year_value]['total'])}
            for key, value in yearly_map[year_value].items():
                if key != 'total':
                    entry[key] = int(value)
            yearly_data.append(entry)

        query_department = f"""
            SELECT department,
                   COUNT(*) AS total
            FROM externship_info
            {where_clause}
            GROUP BY department
            ORDER BY total DESC
        """
        cur.execute(query_department, params)
        department_data = []
        for row in cur.fetchall():
            department_data.append({
                'department': row['department'],
                'total': int(row['total']),
            })

        return jsonify({'total': int(total_externships), 'yearly': yearly_data, 'department': department_data})
    except Exception as exc:
        return jsonify({'message': f'Failed to fetch externship summary: {exc}'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@research_bp.route('/externships/list', methods=['GET'])
@token_required
def externship_list(current_user_id):
    conn = None
    cur = None
    try:
        department = request.args.get('department')
        year = request.args.get('externship_year')

        conn = get_db_connection()
        if not _table_exists(conn, 'externship_info'):
            return jsonify({'data': []})

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

        query = f"""
            SELECT
                externid AS externship_id,
                empname AS faculty_name,
                department,
                industry_name,
                "type" AS externship_type,
                startdate,
                enddate,
                CASE
                    WHEN enddate IS NOT NULL THEN (enddate - startdate)
                    ELSE NULL
                END AS duration_days
            FROM externship_info
            {where_clause}
            ORDER BY startdate DESC NULLS LAST, empname
        """
        cur.execute(query, params)
        rows = []
        for row in cur.fetchall():
            rows.append({
                'externship_id': row['externship_id'],
                'faculty_name': row['faculty_name'],
                'department': row['department'],
                'industry_name': row['industry_name'],
                'type': row['externship_type'],
                'startdate': _serialize_date(row['startdate']),
                'enddate': _serialize_date(row['enddate']),
                'duration_days': int(row['duration_days']) if row['duration_days'] is not None else None,
            })
        return jsonify({'data': rows})
    except Exception as exc:
        return jsonify({'message': f'Failed to fetch externships: {exc}'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@research_bp.route('/publications/summary', methods=['GET'])
@token_required
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
        return jsonify({'message': f'Failed to fetch publication summary: {exc}'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@research_bp.route('/publications/trend', methods=['GET'])
@token_required
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
        return jsonify({'message': f'Failed to fetch publication trend: {exc}'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@research_bp.route('/publications/department', methods=['GET'])
@token_required
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
        return jsonify({'message': f'Failed to fetch department publications: {exc}'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@research_bp.route('/publications/type-distribution', methods=['GET'])
@token_required
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
        return jsonify({'message': f'Failed to fetch publication type distribution: {exc}'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@research_bp.route('/publications/list', methods=['GET'])
@token_required
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
        return jsonify({'message': f'Failed to fetch publications: {exc}'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()