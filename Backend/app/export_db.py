import csv
import io
from flask import Blueprint, jsonify, request, send_file
from psycopg2 import sql
from .db import get_db_connection, release_db_connection
from .auth import token_required, _require_admin
from . import bcrypt, limiter

export_db_bp = Blueprint('export_db', __name__)

_FORMULA_LEAD_CHARS = ('=', '+', '-', '@', '\t', '\r')


def _csv_safe(value):
    """
    Neutralizes CSV/formula injection (CWE-1236): a cell that starts with
    =, +, -, @, tab, or CR is interpreted as a formula by Excel/Sheets when
    the exported file is opened. Prefixing it with an apostrophe forces it
    to be read back as literal text instead of executed.
    """
    if isinstance(value, str) and value.startswith(_FORMULA_LEAD_CHARS):
        return "'" + value
    return value

@export_db_bp.route('/tables', methods=['GET'])
@token_required
def get_tables(current_user_id):
    """Returns a list of all tables in the public schema. Admin only."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if not _require_admin(cur, current_user_id):
            return jsonify({'message': 'Admin access required'}), 403

        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema='public' 
            ORDER BY table_name;
        """)
        tables = [row['table_name'] for row in cur.fetchall()]
        return jsonify(tables), 200
    except Exception as e:
        print(f"Error listing tables: {e}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        cur.close()
        release_db_connection(conn)

@export_db_bp.route('/table/<table_name>', methods=['GET'])
@token_required
def export_table(current_user_id, table_name):
    """Exports a specific table as CSV. Admin only."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if not _require_admin(cur, current_user_id):
            return jsonify({'message': 'Admin access required'}), 403

        # Validate table name (simple check against information_schema to prevent SQL injection)
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name=%s;", (table_name,))
        if not cur.fetchone():
            return jsonify({'message': 'Table not found'}), 404

        cur.execute(sql.SQL("SELECT * FROM {}").format(sql.Identifier(table_name)))
        rows = cur.fetchall()

        cols = [desc[0] for desc in cur.description]

        si = io.StringIO()
        cw = csv.writer(si)
        cw.writerow(cols)

        for row in rows:
            cw.writerow([_csv_safe(row[c]) for c in cols])

        output = io.BytesIO()
        output.write(si.getvalue().encode('utf-8'))
        output.seek(0)

        return send_file(
            output,
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'{table_name}_export.csv'
        )

    except Exception as e:
        print(f"Error exporting table: {e}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        cur.close()
        release_db_connection(conn)


@export_db_bp.route('/truncate/<table_name>', methods=['POST'])
@limiter.limit("10 per hour")
@token_required
def truncate_table(current_user_id, table_name):
    """Truncates a specific table after admin + password verification. Admin only."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if not _require_admin(cur, current_user_id):
            return jsonify({'message': 'Admin access required'}), 403

        # Validate table name against information_schema to prevent SQL injection
        cur.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name=%s;",
            (table_name,)
        )
        if not cur.fetchone():
            return jsonify({'message': 'Table not found'}), 404

        data = request.get_json()
        if not data or not data.get('password'):
            return jsonify({'message': 'Admin password is required'}), 400

        # Verify admin's password
        cur.execute("SELECT password_hash FROM users WHERE id = %s;", (current_user_id,))
        user = cur.fetchone()
        if not user or not bcrypt.check_password_hash(user['password_hash'], data['password']):
            return jsonify({'message': 'Password verification failed. If you signed in via Google, set a password first.'}), 401

        cur.execute(sql.SQL("TRUNCATE TABLE {} RESTART IDENTITY CASCADE").format(sql.Identifier(table_name)))
        conn.commit()
        return jsonify({'message': f"Table '{table_name}' truncated successfully."}), 200

    except Exception as e:
        conn.rollback()
        print(f"Error truncating table: {e}")
        return jsonify({'message': 'An internal error occurred.'}), 500
    finally:
        cur.close()
        release_db_connection(conn)
