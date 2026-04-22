from flask import Blueprint, jsonify
from .db import get_db_connection, release_db_connection

nirf_bp = Blueprint('nirf', __name__)

@nirf_bp.route('/nirf_metrics', methods=['GET'])
def get_nirf_metrics():
    """Fetch NIRF ranking data for all years."""
    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed!'}), 500
            
        cur = conn.cursor()
        cur.execute("""
            SELECT year, tlr_score, rpc_score, go_score, oi_score, pr_score, rank
            FROM nirf_ranking 
            ORDER BY year ASC;
        """)
        rows = cur.fetchall()
        
        # Convert to list of dicts
        data = []
        for row in rows:
            data.append({
                'year': row['year'],
                'tlr': float(row['tlr_score']) if row['tlr_score'] else 0,
                'rpc': float(row['rpc_score']) if row['rpc_score'] else 0,
                'go': float(row['go_score']) if row['go_score'] else 0,
                'oi': float(row['oi_score']) if row['oi_score'] else 0,
                'pr': float(row['pr_score']) if row['pr_score'] else 0,
                'rank': int(row['rank']) if row['rank'] else None
            })
            
        return jsonify(data), 200

    except Exception as e:
        print(f"NIRF API error: {e}")
        return jsonify({'message': f'Error fetching NIRF data: {str(e)}'}), 500
    finally:
        if conn:
            cur.close()
            release_db_connection(conn)
