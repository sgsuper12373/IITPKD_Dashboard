"""Blueprint for MOU partner logo cards shown on the /mou-collaborations page."""
import os
import uuid

from flask import Blueprint, current_app, jsonify, request
from psycopg2 import errors as pg_errors, extras

from .auth import token_optional, token_required
from .db import get_db_connection, release_db_connection
from .image_safety import ImageRejected, validate_and_reencode

mou_partners_bp = Blueprint('mou_partners', __name__)


def _check_admin(conn, user_id):
    cur = conn.cursor()
    try:
        cur.execute("SELECT role_id FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        return row is not None and row['role_id'] in (3, 4)
    finally:
        cur.close()


def _save_logo(file):
    """
    Validates the upload by decoding it as an image (not by trusting the
    filename extension), re-encodes it, and saves the clean bytes.
    """
    try:
        clean_bytes, _content_type, ext = validate_and_reencode(file.read())
    except ImageRejected as rej:
        return None, str(rej)
    filename = f"{uuid.uuid4().hex}.{ext}"
    upload_folder = current_app.config.get(
        'UPLOAD_FOLDER',
        os.path.join(os.path.dirname(__file__), '..', 'uploads', 'logos'),
    )
    save_path = os.path.join(upload_folder, filename)
    with open(save_path, 'wb') as f:
        f.write(clean_bytes)
    return f'/uploads/logos/{filename}', None


def _delete_logo_file(logo_url):
    if not logo_url:
        return
    filename = os.path.basename(logo_url.split('/uploads/logos/')[-1])
    upload_folder = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'logos')
    try:
        os.remove(os.path.join(upload_folder, filename))
    except OSError:
        pass


# ── GET / ──────────────────────────────────────────────────────────────────────

@mou_partners_bp.route('/', methods=['GET'])
@token_optional
def get_partners(current_user_id=None):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        cur.execute(
            "SELECT id, name, logo_url, display_order FROM mou_partner_logos ORDER BY display_order ASC"
        )
        rows = cur.fetchall()
        cur.close()
        return jsonify([dict(r) for r in rows]), 200
    except pg_errors.UndefinedTable:
        conn.rollback()
        return jsonify([]), 200
    finally:
        release_db_connection(conn)


# ── POST / ────────────────────────────────────────────────────────────────────

@mou_partners_bp.route('/', methods=['POST'])
@token_required
def add_partner(current_user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        if not _check_admin(conn, current_user_id):
            return jsonify({'error': 'Admin access required.'}), 403

        name = request.form.get('name', '').strip()
        if not name:
            return jsonify({'error': 'name is required.'}), 400

        logo_url = None
        if 'logo' in request.files and request.files['logo'].filename:
            logo_url, err = _save_logo(request.files['logo'])
            if err:
                return jsonify({'error': err}), 400

        cur.execute(
            """
            INSERT INTO mou_partner_logos (name, logo_url, display_order)
            VALUES (%s, %s, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM mou_partner_logos))
            RETURNING id, name, logo_url, display_order
            """,
            (name, logo_url),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        return jsonify(dict(row)), 201
    finally:
        release_db_connection(conn)


# ── PUT /<id> ─────────────────────────────────────────────────────────────────

@mou_partners_bp.route('/<int:partner_id>', methods=['PUT'])
@token_required
def update_partner(current_user_id, partner_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        if not _check_admin(conn, current_user_id):
            return jsonify({'error': 'Admin access required.'}), 403

        cur.execute(
            "SELECT id, logo_url FROM mou_partner_logos WHERE id = %s", (partner_id,)
        )
        existing = cur.fetchone()
        if not existing:
            return jsonify({'error': 'Partner not found.'}), 404

        name = request.form.get('name', '').strip() or None
        new_logo_url = existing['logo_url']

        if 'logo' in request.files and request.files['logo'].filename:
            saved_url, err = _save_logo(request.files['logo'])
            if err:
                return jsonify({'error': err}), 400
            _delete_logo_file(existing['logo_url'])
            new_logo_url = saved_url

        cur.execute(
            """
            UPDATE mou_partner_logos
            SET name = COALESCE(%s, name),
                logo_url = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id, name, logo_url, display_order
            """,
            (name, new_logo_url, partner_id),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        return jsonify(dict(row)), 200
    finally:
        release_db_connection(conn)


# ── DELETE /<id> ──────────────────────────────────────────────────────────────

@mou_partners_bp.route('/<int:partner_id>', methods=['DELETE'])
@token_required
def delete_partner(current_user_id, partner_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        if not _check_admin(conn, current_user_id):
            return jsonify({'error': 'Admin access required.'}), 403

        cur.execute(
            "DELETE FROM mou_partner_logos WHERE id = %s RETURNING logo_url", (partner_id,)
        )
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Partner not found.'}), 404

        _delete_logo_file(row['logo_url'])
        conn.commit()
        cur.close()
        return jsonify({'message': 'Deleted.'}), 200
    finally:
        release_db_connection(conn)


# ── PUT /reorder ──────────────────────────────────────────────────────────────

@mou_partners_bp.route('/reorder', methods=['PUT'])
@token_required
def reorder_partners(current_user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        cur = conn.cursor()
        if not _check_admin(conn, current_user_id):
            return jsonify({'error': 'Admin access required.'}), 403

        data = request.get_json(silent=True) or {}
        items = data.get('items', [])
        if not items:
            return jsonify({'error': 'items list is required.'}), 400

        for item in items:
            cur.execute(
                "UPDATE mou_partner_logos SET display_order = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (item['display_order'], item['id']),
            )
        conn.commit()
        cur.close()
        return jsonify({'message': 'Reordered.'}), 200
    finally:
        release_db_connection(conn)
