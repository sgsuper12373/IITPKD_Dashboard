"""Dashboard: returns the authenticated user's profile."""
from flask import Blueprint, jsonify
from .db import get_db_connection, release_db_connection
from .auth import token_required

dashboard_bp = Blueprint('api', __name__)


@dashboard_bp.route('/dashboard', methods=['GET'])
@token_required
def protected_dashboard(current_user_id):
    """Returns the current user's profile data from the users table."""
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed!'}), 500

        cur = conn.cursor()
        cur.execute(
            "SELECT id, email, display_name, username, status, created_at, role_id "
            "FROM users WHERE id = %s;",
            (current_user_id,)
        )
        user_data = cur.fetchone()

        if not user_data:
            return jsonify({'message': 'User not found.'}), 404

        return jsonify({'message': 'Welcome to your dashboard!', 'user': user_data}), 200

    except Exception as e:
        print(f"Dashboard error: {e}")
        return jsonify({'message': 'Could not get dashboard data.'}), 500
    finally:
        if conn:
            cur.close()
            release_db_connection(conn)
