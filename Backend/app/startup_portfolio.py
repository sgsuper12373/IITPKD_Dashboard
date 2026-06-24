"""Blueprint for the public "Startup Portfolio" showcase.

Showcases startups from both iptif_startup_table and techin_startup_table as rich
cards (logo, tagline, founder, summary, website). The read endpoint is public and
NEVER exposes revenue or jobs — only display columns. Editing enriches existing
startup rows (no create/delete; those live in the bulk CSV upload pipeline) and is
restricted by origin: IPTIF startups → roles (3, 14), TechIN startups → roles (3, 13).
Logos are stored under uploads/startups/, mirroring the IPTIF facilities flow.
"""
import os
import uuid

from flask import Blueprint, current_app, jsonify, request
from psycopg2 import errors as pg_errors, extras
from werkzeug.utils import secure_filename

from .auth import token_optional, token_required
from .db import get_db_connection, release_db_connection

startup_portfolio_bp = Blueprint('startup_portfolio', __name__)

ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}

# origin → (table, roles allowed to edit). Mirrors SECTION_PERMISSIONS innovation/iptif & innovation/techin.
ORIGINS = {
    'iptif':  {'table': 'iptif_startup_table',  'roles': (3, 14)},
    'techin': {'table': 'techin_startup_table', 'roles': (3, 13)},
}

# Display columns returned to the public — revenue and number_of_jobs are intentionally omitted.
# id is cast to text so the two tables (iptif id = varchar, techin id = integer) can UNION cleanly;
# it is treated as a string in the API/URL either way.
_SHOWCASE_COLUMNS = (
    "id::text AS id, startup_name, domain, status, incubated_date, startup_logo, "
    "startup_website_link, startup_founder_name, startup_founder_profile_line, "
    "startup_summary, startup_tagline, last_updated"
)

# Manage view additionally needs the publish flag so admins can publish/unpublish.
_MANAGE_COLUMNS = _SHOWCASE_COLUMNS + ", is_published"

# Editable text fields (startup_name/domain/status come from the data pipeline; logo & is_published handled separately).
_EDITABLE_FIELDS = (
    'startup_website_link', 'startup_founder_name', 'startup_founder_profile_line',
    'startup_summary', 'startup_tagline',
)

# Extra fields collected only when creating a brand-new startup inline (normally filled by the CSV pipeline).
_CREATE_EXTRA = ('domain', 'status', 'incubated_date')


def _editable_origins(conn, user_id):
    """Return the set of origins the user may edit ('iptif', 'techin')."""
    cur = conn.cursor()
    try:
        cur.execute("SELECT role_id FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if not row:
            return set()
        role = row['role_id']
        return {origin for origin, cfg in ORIGINS.items() if role in cfg['roles']}
    finally:
        cur.close()


def _save_image(file):
    """Validate extension, save to the startups upload folder, return stored path or error."""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return None, f"File type '{ext}' not allowed."
    filename = uuid.uuid4().hex + '_' + secure_filename(file.filename)
    upload_folder = current_app.config.get(
        'STARTUPS_UPLOAD_FOLDER',
        os.path.join(os.path.dirname(__file__), '..', 'uploads', 'startups'),
    )
    save_path = os.path.join(upload_folder, filename)
    file.save(save_path)
    return f'/uploads/startups/{filename}', None


def _delete_image_file(logo):
    """Remove a previously uploaded logo file. External URLs (http…) are left untouched."""
    if not logo or '/uploads/startups/' not in logo:
        return
    filename = os.path.basename(logo.split('/uploads/startups/')[-1])
    upload_folder = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'startups')
    try:
        os.remove(os.path.join(upload_folder, filename))
    except OSError:
        pass


def _form_values():
    """Read editable text fields from the multipart form, blanks coerced to None (keep-existing)."""
    return {field: (request.form.get(field) or '').strip() or None for field in _EDITABLE_FIELDS}


def _parse_bool(value):
    return str(value).strip().lower() in ('true', '1', 'on', 'yes')


def _new_id(cur, origin):
    """Generate a fresh PK for an inline-created startup (tables have no id default)."""
    if origin == 'techin':  # integer PK — next sequential id
        cur.execute("SELECT COALESCE(MAX(id), 0) + 1 AS nid FROM techin_startup_table")
        return cur.fetchone()['nid']
    return 'IPTIF-ST-' + uuid.uuid4().hex[:10].upper()  # varchar PK


# ── GET / ──────────────────────────────────────────────────────────────────────

@startup_portfolio_bp.route('/', methods=['GET'])
@token_optional
def get_portfolio(current_user_id=None):
    """Public list of published startups across both incubators."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        selects = " UNION ALL ".join(
            f"SELECT {_SHOWCASE_COLUMNS}, '{origin}' AS origin "
            f"FROM {cfg['table']} WHERE is_published"
            for origin, cfg in ORIGINS.items()
        )
        cur.execute(f"SELECT * FROM ({selects}) AS portfolio ORDER BY startup_name ASC")
        rows = cur.fetchall()
        cur.close()
        return jsonify([dict(r) for r in rows]), 200
    except (pg_errors.UndefinedTable, pg_errors.UndefinedColumn):
        # Migration not applied yet — degrade gracefully instead of 500.
        conn.rollback()
        return jsonify([]), 200
    finally:
        release_db_connection(conn)


# ── GET /manage ────────────────────────────────────────────────────────────────

@startup_portfolio_bp.route('/manage', methods=['GET'])
@token_required
def get_manage_list(current_user_id):
    """All startups (published + unpublished) for the origins the caller may edit."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        editable = _editable_origins(conn, current_user_id)
        if not editable:
            return jsonify([]), 200

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        selects = " UNION ALL ".join(
            f"SELECT {_MANAGE_COLUMNS}, '{origin}' AS origin FROM {ORIGINS[origin]['table']}"
            for origin in sorted(editable)
        )
        cur.execute(f"SELECT * FROM ({selects}) AS portfolio ORDER BY startup_name ASC")
        rows = cur.fetchall()
        cur.close()
        return jsonify([dict(r) for r in rows]), 200
    except (pg_errors.UndefinedTable, pg_errors.UndefinedColumn):
        conn.rollback()
        return jsonify([]), 200
    finally:
        release_db_connection(conn)


# ── POST /<origin> ─────────────────────────────────────────────────────────────

@startup_portfolio_bp.route('/<origin>', methods=['POST'])
@token_required
def create_startup(current_user_id, origin):
    """Inline-create a new startup in the given incubator's table (admin-only)."""
    if origin not in ORIGINS:
        return jsonify({'error': 'Unknown startup origin.'}), 404

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        if origin not in _editable_origins(conn, current_user_id):
            return jsonify({'error': f'{origin.upper()} admin access required.'}), 403

        startup_name = (request.form.get('startup_name') or '').strip()
        if not startup_name:
            return jsonify({'error': 'startup_name is required.'}), 400

        table = ORIGINS[origin]['table']
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        values = _form_values()
        extra = {f: (request.form.get(f) or '').strip() or None for f in _CREATE_EXTRA}

        logo = None
        if 'image' in request.files and request.files['image'].filename:
            logo, err = _save_image(request.files['image'])
            if err:
                return jsonify({'error': err}), 400
        else:
            posted_logo = (request.form.get('startup_logo') or '').strip()
            if posted_logo:
                logo = posted_logo

        cols = ['id', 'startup_name', *_CREATE_EXTRA, *_EDITABLE_FIELDS, 'startup_logo', 'is_published']
        vals = [
            _new_id(cur, origin), startup_name,
            *(extra[f] for f in _CREATE_EXTRA),
            *(values[f] for f in _EDITABLE_FIELDS),
            logo, _parse_bool(request.form.get('is_published')),
        ]
        cur.execute(
            f"""
            INSERT INTO {table} ({', '.join(cols)})
            VALUES ({', '.join(['%s'] * len(cols))})
            RETURNING {_MANAGE_COLUMNS}
            """,
            vals,
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        result = dict(row)
        result['origin'] = origin
        return jsonify(result), 201
    finally:
        release_db_connection(conn)


# ── PUT /<origin>/<id> ─────────────────────────────────────────────────────────

@startup_portfolio_bp.route('/<origin>/<startup_id>', methods=['PUT'])
@token_required
def update_startup(current_user_id, origin, startup_id):
    """Enrich an existing startup's showcase fields, logo, and publish state."""
    if origin not in ORIGINS:
        return jsonify({'error': 'Unknown startup origin.'}), 404

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        if origin not in _editable_origins(conn, current_user_id):
            return jsonify({'error': f'{origin.upper()} admin access required.'}), 403

        table = ORIGINS[origin]['table']
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        cur.execute(f"SELECT id, startup_logo FROM {table} WHERE id = %s", (startup_id,))
        existing = cur.fetchone()
        if not existing:
            return jsonify({'error': 'Startup not found.'}), 404

        values = _form_values()

        # Logo precedence: uploaded file > pasted URL > keep existing.
        new_logo = existing['startup_logo']
        if 'image' in request.files and request.files['image'].filename:
            saved_url, err = _save_image(request.files['image'])
            if err:
                return jsonify({'error': err}), 400
            _delete_image_file(existing['startup_logo'])
            new_logo = saved_url
        else:
            posted_logo = (request.form.get('startup_logo') or '').strip()
            if posted_logo:
                new_logo = posted_logo

        # Publish flag is set explicitly when present, otherwise left unchanged.
        if 'is_published' in request.form:
            published_clause = ", is_published = %s"
            published_param = [_parse_bool(request.form.get('is_published'))]
        else:
            published_clause = ""
            published_param = []

        # COALESCE keeps the existing value when an editable field is omitted/blank.
        set_clause = ', '.join(f"{field} = COALESCE(%s, {field})" for field in _EDITABLE_FIELDS)
        cur.execute(
            f"""
            UPDATE {table}
            SET {set_clause}, startup_logo = %s{published_clause}
            WHERE id = %s
            RETURNING {_MANAGE_COLUMNS}
            """,
            (*(values[f] for f in _EDITABLE_FIELDS), new_logo, *published_param, startup_id),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        result = dict(row)
        result['origin'] = origin
        return jsonify(result), 200
    finally:
        release_db_connection(conn)
