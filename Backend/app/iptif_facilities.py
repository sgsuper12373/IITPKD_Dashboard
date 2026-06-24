"""Blueprint for the public IPTIF Facilities showcase page.

Read endpoint is public (revenue is never exposed). Create/update/delete are
restricted to IPTIF admins (role 3 = Master Admin, 14 = IPTIF). Images are stored
on the server under uploads/facilities/, mirroring the MOU partner-logo flow.
"""
import os
import uuid

from flask import Blueprint, current_app, jsonify, request
from psycopg2 import errors as pg_errors, extras
from werkzeug.utils import secure_filename

from .auth import token_optional, token_required
from .db import get_db_connection, release_db_connection

iptif_facilities_bp = Blueprint('iptif_facilities', __name__)

ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}

# Roles allowed to modify IPTIF facilities (mirrors SECTION_PERMISSIONS['innovation/iptif']).
IPTIF_ADMIN_ROLES = (3, 14)

# Columns returned to the public — note revenue_made is intentionally omitted.
_PUBLIC_COLUMNS = (
    "facility_id, display_title, facility_name, facility_type, facility_summary, "
    "image_url, availability_status, availing_guidance, more_info_link, last_updated"
)

# Manage view additionally needs the publish flag so admins can publish/unpublish.
_MANAGE_COLUMNS = _PUBLIC_COLUMNS + ", is_published"

# Showcase-editable text fields (everything except the image, which is handled separately).
_EDITABLE_FIELDS = (
    'display_title', 'facility_name', 'facility_type', 'facility_summary',
    'availability_status', 'availing_guidance', 'more_info_link',
)


def _parse_bool(value):
    return str(value).strip().lower() in ('true', '1', 'on', 'yes')


def _check_iptif_admin(conn, user_id):
    cur = conn.cursor()
    try:
        cur.execute("SELECT role_id FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        return row is not None and row['role_id'] in IPTIF_ADMIN_ROLES
    finally:
        cur.close()


def _save_image(file):
    """Validate extension, save to the facilities upload folder, return stored path or error."""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return None, f"File type '{ext}' not allowed."
    filename = uuid.uuid4().hex + '_' + secure_filename(file.filename)
    upload_folder = current_app.config.get(
        'FACILITIES_UPLOAD_FOLDER',
        os.path.join(os.path.dirname(__file__), '..', 'uploads', 'facilities'),
    )
    save_path = os.path.join(upload_folder, filename)
    file.save(save_path)
    return f'/uploads/facilities/{filename}', None


def _delete_image_file(image_url):
    if not image_url:
        return
    filename = os.path.basename(image_url.split('/uploads/facilities/')[-1])
    upload_folder = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'facilities')
    try:
        os.remove(os.path.join(upload_folder, filename))
    except OSError:
        pass


def _form_values():
    """Read editable text fields from the multipart form, blanks coerced to None."""
    return {field: (request.form.get(field) or '').strip() or None for field in _EDITABLE_FIELDS}


# ── GET / ────────────────────────────────────────────────────────────────────

@iptif_facilities_bp.route('/', methods=['GET'])
@token_optional
def get_facilities(current_user_id=None):
    """Public list of published, showcased facilities.

    A facility is 'showcased' once it has a display_title, and only appears here
    once an admin has published it (is_published = true).
    """
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        cur.execute(
            f"""
            SELECT {_PUBLIC_COLUMNS}
            FROM iptif_facilities_table
            WHERE display_title IS NOT NULL AND is_published
            ORDER BY display_title ASC
            """
        )
        rows = cur.fetchall()
        cur.close()
        return jsonify([dict(r) for r in rows]), 200
    except (pg_errors.UndefinedTable, pg_errors.UndefinedColumn):
        # Migration not applied yet — degrade gracefully instead of 500.
        conn.rollback()
        return jsonify([]), 200
    finally:
        release_db_connection(conn)


# ── GET /manage ──────────────────────────────────────────────────────────────

@iptif_facilities_bp.route('/manage', methods=['GET'])
@token_required
def get_manage_facilities(current_user_id):
    """All showcased facilities (published + draft) for IPTIF admins to manage."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        if not _check_iptif_admin(conn, current_user_id):
            return jsonify({'error': 'IPTIF admin access required.'}), 403

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        cur.execute(
            f"""
            SELECT {_MANAGE_COLUMNS}
            FROM iptif_facilities_table
            WHERE display_title IS NOT NULL
            ORDER BY display_title ASC
            """
        )
        rows = cur.fetchall()
        cur.close()
        return jsonify([dict(r) for r in rows]), 200
    except (pg_errors.UndefinedTable, pg_errors.UndefinedColumn):
        conn.rollback()
        return jsonify([]), 200
    finally:
        release_db_connection(conn)


# ── POST / ───────────────────────────────────────────────────────────────────

@iptif_facilities_bp.route('/', methods=['POST'])
@token_required
def add_facility(current_user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        if not _check_iptif_admin(conn, current_user_id):
            return jsonify({'error': 'IPTIF admin access required.'}), 403

        values = _form_values()
        if not values['display_title']:
            return jsonify({'error': 'display_title is required.'}), 400
        # facility_name is NOT NULL in the table — fall back to the display title.
        if not values['facility_name']:
            values['facility_name'] = values['display_title']

        image_url = None
        if 'image' in request.files and request.files['image'].filename:
            image_url, err = _save_image(request.files['image'])
            if err:
                return jsonify({'error': err}), 400

        is_published = _parse_bool(request.form.get('is_published'))
        cur.execute(
            f"""
            INSERT INTO iptif_facilities_table
                (facility_id, {', '.join(_EDITABLE_FIELDS)}, image_url, is_published)
            VALUES (%s, {', '.join(['%s'] * len(_EDITABLE_FIELDS))}, %s, %s)
            RETURNING {_MANAGE_COLUMNS}
            """,
            (uuid.uuid4().hex, *(values[f] for f in _EDITABLE_FIELDS), image_url, is_published),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        return jsonify(dict(row)), 201
    finally:
        release_db_connection(conn)


# ── PUT /<facility_id> ───────────────────────────────────────────────────────

@iptif_facilities_bp.route('/<facility_id>', methods=['PUT'])
@token_required
def update_facility(current_user_id, facility_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        if not _check_iptif_admin(conn, current_user_id):
            return jsonify({'error': 'IPTIF admin access required.'}), 403

        cur.execute(
            "SELECT facility_id, image_url FROM iptif_facilities_table WHERE facility_id = %s",
            (facility_id,),
        )
        existing = cur.fetchone()
        if not existing:
            return jsonify({'error': 'Facility not found.'}), 404

        values = _form_values()
        new_image_url = existing['image_url']
        if 'image' in request.files and request.files['image'].filename:
            saved_url, err = _save_image(request.files['image'])
            if err:
                return jsonify({'error': err}), 400
            _delete_image_file(existing['image_url'])
            new_image_url = saved_url

        # Publish flag is set explicitly when present, otherwise left unchanged.
        if 'is_published' in request.form:
            published_clause = ", is_published = %s"
            published_param = [_parse_bool(request.form.get('is_published'))]
        else:
            published_clause = ""
            published_param = []

        # COALESCE keeps the existing value when a field is omitted/blank.
        set_clause = ', '.join(f"{field} = COALESCE(%s, {field})" for field in _EDITABLE_FIELDS)
        cur.execute(
            f"""
            UPDATE iptif_facilities_table
            SET {set_clause}, image_url = %s{published_clause}
            WHERE facility_id = %s
            RETURNING {_MANAGE_COLUMNS}
            """,
            (*(values[f] for f in _EDITABLE_FIELDS), new_image_url, *published_param, facility_id),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        return jsonify(dict(row)), 200
    finally:
        release_db_connection(conn)


# ── DELETE /<facility_id> ────────────────────────────────────────────────────

@iptif_facilities_bp.route('/<facility_id>', methods=['DELETE'])
@token_required
def delete_facility(current_user_id, facility_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        if not _check_iptif_admin(conn, current_user_id):
            return jsonify({'error': 'IPTIF admin access required.'}), 403

        cur.execute(
            "DELETE FROM iptif_facilities_table WHERE facility_id = %s RETURNING image_url",
            (facility_id,),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Facility not found.'}), 404

        _delete_image_file(row['image_url'])
        conn.commit()
        cur.close()
        return jsonify({'message': 'Deleted.'}), 200
    finally:
        release_db_connection(conn)
