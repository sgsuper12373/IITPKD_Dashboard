from flask import Blueprint, jsonify

from .auth import token_optional
from .db import get_db_connection, release_db_connection

grievance_bp = Blueprint('grievance', __name__)


def _fetch_yearly_data(query):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return None, "Database connection failed."

        cur = conn.cursor()
        cur.execute(query)
        rows = cur.fetchall()
        return rows, None
    except Exception as exc:
        print(f"Error fetching grievance data: {exc}")
        return None, "Failed to fetch grievance data."
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


def _fetch_summary(query):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return None, "Database connection failed."

        cur = conn.cursor()
        cur.execute(query)
        row = cur.fetchone()
        return row, None
    except Exception as exc:
        print(f"Error fetching grievance summary: {exc}")
        return None, "Failed to fetch grievance summary."
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


@grievance_bp.route('/igrc/yearly', methods=['GET'])
@token_optional
def get_igrc_yearly(current_user_id):
    """
    Returns the year-wise grievance statistics for IGRC.
    """
    query = """
        SELECT
            grievance_year,
            total_grievances_filed,
            grievances_resolved,
            grievances_pending
        FROM igrs_yearwise
        ORDER BY grievance_year ASC;
    """
    rows, error = _fetch_yearly_data(query)
    if error:
        return jsonify({'message': error}), 500

    return jsonify({'data': rows}), 200


@grievance_bp.route('/igrc/summary', methods=['GET'])
@token_optional
def get_igrc_summary(current_user_id):
    """
    Returns aggregated IGRC grievance statistics.
    """
    query = """
        SELECT
            COALESCE(SUM(total_grievances_filed), 0) AS total,
            COALESCE(SUM(grievances_resolved), 0) AS resolved,
            COALESCE(SUM(grievances_pending), 0) AS pending
        FROM igrs_yearwise;
    """
    row, error = _fetch_summary(query)
    if error:
        return jsonify({'message': error}), 500

    return jsonify({'data': row}), 200


@grievance_bp.route('/icc/yearly', methods=['GET'])
@token_optional
def get_icc_yearly(current_user_id):
    """
    Returns the year-wise complaint statistics for ICC.
    """
    query = """
        SELECT
            complaints_year,
            total_complaints,
            complaints_resolved,
            complaints_pending
        FROM icc_yearwise
        ORDER BY complaints_year ASC;
    """
    rows, error = _fetch_yearly_data(query)
    if error:
        return jsonify({'message': error}), 500

    return jsonify({'data': rows}), 200


@grievance_bp.route('/icc/summary', methods=['GET'])
@token_optional
def get_icc_summary(current_user_id):
    """
    Returns aggregated ICC complaint statistics.
    """
    query = """
        SELECT
            COALESCE(SUM(total_complaints), 0) AS total,
            COALESCE(SUM(complaints_resolved), 0) AS resolved,
            COALESCE(SUM(complaints_pending), 0) AS pending
        FROM icc_yearwise;
    """
    row, error = _fetch_summary(query)
    if error:
        return jsonify({'message': error}), 500

    return jsonify({'data': row}), 200

