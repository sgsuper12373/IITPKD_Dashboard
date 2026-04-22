from decimal import Decimal

from flask import Blueprint, jsonify

from .auth import token_required
from .db import get_db_connection, release_db_connection

ewd_bp = Blueprint('ewd', __name__)


def _fetch_all_rows():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if conn is None:
            return None, "Database connection failed."

        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                ewd_year,
                annual_electricity_consumption,
                per_capita_electricity_consumption,
                per_capita_water_consumption,
                per_capita_recycled_water,
                green_coverage
            FROM ewd_yearwise
            ORDER BY ewd_year ASC;
            """
        )
        rows = cur.fetchall()
        return rows, None
    except Exception as exc:
        print(f"Error fetching EWD data: {exc}")
        return None, "Failed to fetch EWD data."
    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)


def _convert_decimal(row):
    if row is None:
        return None
    return {
        key: float(value) if isinstance(value, Decimal) else value
        for key, value in row.items()
    }


@ewd_bp.route('/yearly', methods=['GET'])
@token_required
def get_ewd_yearly(current_user_id):
    rows, error = _fetch_all_rows()
    if error:
        return jsonify({'message': error}), 500

    data = [_convert_decimal(row) for row in rows] if rows else []
    return jsonify({'data': data}), 200


@ewd_bp.route('/summary', methods=['GET'])
@token_required
def get_ewd_summary(current_user_id):
    rows, error = _fetch_all_rows()
    if error:
        return jsonify({'message': error}), 500

    if not rows:
        empty = {
            'total_annual_electricity': 0,
            'average_per_capita_electricity': 0,
            'average_per_capita_water': 0,
            'average_per_capita_recycled_water': 0,
            'average_green_coverage': 0,
            'latest': None
        }
        return jsonify({'data': empty}), 200

    data = [_convert_decimal(row) for row in rows]

    total_annual = sum(row['annual_electricity_consumption'] for row in data)
    avg_per_capita_electricity = sum(row['per_capita_electricity_consumption'] for row in data) / len(data)
    avg_per_capita_water = sum(row['per_capita_water_consumption'] for row in data) / len(data)
    avg_per_capita_recycled = sum(row['per_capita_recycled_water'] for row in data) / len(data)
    avg_green = sum(row['green_coverage'] for row in data) / len(data)

    latest = max(data, key=lambda row: row['ewd_year'])

    summary = {
        'total_annual_electricity': total_annual,
        'average_per_capita_electricity': avg_per_capita_electricity,
        'average_per_capita_water': avg_per_capita_water,
        'average_per_capita_recycled_water': avg_per_capita_recycled,
        'average_green_coverage': avg_green,
        'latest': latest
    }

    return jsonify({'data': summary}), 200

