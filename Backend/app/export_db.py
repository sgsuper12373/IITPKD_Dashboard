import csv
import io
from flask import Blueprint, jsonify, request, send_file
from .db import get_db_connection, release_db_connection
from .auth import token_required, _require_admin
from . import bcrypt

export_db_bp = Blueprint('export_db', __name__)

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
        return jsonify({'message': str(e)}), 500
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

        cur.execute(f"SELECT * FROM \"{table_name}\";")
        rows = cur.fetchall()
        
        # If no rows, we still want to get column names. Let's get them from cursor.description
        cols = [desc[0] for desc in cur.description]

        si = io.StringIO()
        cw = csv.writer(si)
        cw.writerow(cols)

        for row in rows:
            # rows are RealDictRow, we need to extract values in order of cols
            cw.writerow([row[c] for c in cols])

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
        return jsonify({'message': str(e)}), 500
    finally:
        cur.close()
        release_db_connection(conn)


@export_db_bp.route('/truncate/<table_name>', methods=['POST'])
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

        cur.execute(f'TRUNCATE TABLE "{table_name}" RESTART IDENTITY CASCADE;')
        conn.commit()
        return jsonify({'message': f"Table '{table_name}' truncated successfully."}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'message': str(e)}), 500
    finally:
        cur.close()
        release_db_connection(conn)
