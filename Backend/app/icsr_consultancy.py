"""Blueprint for managing ICSR consultancy projects.

Powers the /research/icsr_consultancy_prj management page where the ICSR section
(role 9) and the master admin (role 3) can list, inline-create, and edit
icsr_consultancy_projects rows — including the sponsoring industry, that
industry's logo, and the project's area. Bulk creation still flows through the
existing CSV upload pipeline; this blueprint handles single-row edits and the
logo upload that CSV cannot express. Logos are stored on disk under
uploads/icsr_industry_project/ and served at the /uploads/industry/<file> URL
(see serve_industry_logo in app/__init__.py), mirroring the IPTIF facilities /
startup portfolio flow.
"""
import os
import uuid
from decimal import Decimal

from flask import Blueprint, current_app, jsonify, request
from psycopg2 import errors as pg_errors, extras

from .auth import token_required
from .db import get_db_connection, release_db_connection
from .image_safety import ImageRejected, validate_and_reencode

icsr_consultancy_bp = Blueprint('icsr_consultancy', __name__)

# Roles allowed to manage consultancy projects: master admin + ICSR section.
# Mirrors SECTION_PERMISSIONS['research/icsr'] on the frontend.
MANAGE_ROLES = (3, 9)

TABLE = 'icsr_consultancy_projects'

# Plain text / varchar fields. principal_investigator & department are NOT NULL.
_TEXT_FIELDS = (
    'project_title', 'principal_investigator', 'department',
    'funding_agency', 'client_organization', 'status',
    'sponsoring_industry', 'project_area',
)
_NUMERIC_FIELDS = ('amount_sanctioned',)
_DATE_FIELDS = ('start_date', 'end_date')

# Every column returned to the management page (logo + last_updated included).
_COLUMNS = (
    'project_id', *_TEXT_FIELDS, *_NUMERIC_FIELDS, *_DATE_FIELDS,
    'industry_logo', 'last_updated',
)


def _can_manage(conn, user_id):
    """True if the user's role may manage consultancy projects."""
    cur = conn.cursor()
    try:
        cur.execute("SELECT role_id FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        return bool(row) and row['role_id'] in MANAGE_ROLES
    finally:
        cur.close()


def _clean(value):
    """Trim a form value; blank → None (so COALESCE keeps the existing value)."""
    value = (value or '').strip()
    return value or None


def _serialize(row):
    """Make a DB row JSON-safe (Decimal → float, date → ISO string)."""
    out = {}
    for key, val in row.items():
        if isinstance(val, Decimal):
            out[key] = float(val)
        elif hasattr(val, 'isoformat'):
            out[key] = val.isoformat()
        else:
            out[key] = val
    return out


def _save_image(file):
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
        'INDUSTRY_PROJECT_UPLOAD_FOLDER',
        os.path.join(os.path.dirname(__file__), '..', 'uploads', 'icsr_industry_project'),
    )
    with open(os.path.join(upload_folder, filename), 'wb') as f:
        f.write(clean_bytes)
    return f'/uploads/industry/{filename}', None


def _delete_image_file(logo):
    """Remove a previously uploaded logo file. External URLs (http…) are left untouched."""
    if not logo or '/uploads/industry/' not in logo:
        return
    filename = os.path.basename(logo.split('/uploads/industry/')[-1])
    upload_folder = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'icsr_industry_project')
    try:
        os.remove(os.path.join(upload_folder, filename))
    except OSError:
        pass


def _resolve_logo(existing=None):
    """Logo precedence: uploaded file > pasted URL > keep existing. Returns (logo, error)."""
    if 'industry_logo_file' in request.files and request.files['industry_logo_file'].filename:
        saved_url, err = _save_image(request.files['industry_logo_file'])
        if err:
            return None, err
        if existing:
            _delete_image_file(existing)
        return saved_url, None
    posted = (request.form.get('industry_logo') or '').strip()
    if posted:
        return posted, None
    return existing, None


# ── GET / ──────────────────────────────────────────────────────────────────────

@icsr_consultancy_bp.route('/', methods=['GET'])
@token_required
def list_projects(current_user_id):
    """All consultancy projects for the management page (admins / ICSR only)."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        if not _can_manage(conn, current_user_id):
            return jsonify({'error': 'ICSR admin access required.'}), 403

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        cur.execute(
            f"SELECT {', '.join(_COLUMNS)} FROM {TABLE} "
            "ORDER BY COALESCE(start_date, end_date) DESC NULLS LAST, project_id DESC"
        )
        rows = cur.fetchall()
        cur.close()
        return jsonify([_serialize(r) for r in rows]), 200
    except (pg_errors.UndefinedTable, pg_errors.UndefinedColumn):
        conn.rollback()
        return jsonify([]), 200
    finally:
        release_db_connection(conn)


# ── POST / ─────────────────────────────────────────────────────────────────────

@icsr_consultancy_bp.route('/', methods=['POST'])
@token_required
def create_project(current_user_id):
    """Inline-create a single consultancy project (admins / ICSR only)."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        if not _can_manage(conn, current_user_id):
            return jsonify({'error': 'ICSR admin access required.'}), 403

        pi = (request.form.get('principal_investigator') or '').strip()
        dept = (request.form.get('department') or '').strip()
        if not pi or not dept:
            return jsonify({'error': 'principal_investigator and department are required.'}), 400

        logo, err = _resolve_logo()
        if err:
            return jsonify({'error': err}), 400

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        cur.execute(f"SELECT COALESCE(MAX(project_id), 0) + 1 AS nid FROM {TABLE}")
        new_id = cur.fetchone()['nid']

        data_fields = (*_TEXT_FIELDS, *_NUMERIC_FIELDS, *_DATE_FIELDS)
        cols = ['project_id', *data_fields, 'industry_logo']
        vals = [new_id, *(_clean(request.form.get(f)) for f in data_fields), logo]

        cur.execute(
            f"""
            INSERT INTO {TABLE} ({', '.join(cols)})
            VALUES ({', '.join(['%s'] * len(cols))})
            RETURNING {', '.join(_COLUMNS)}
            """,
            vals,
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        return jsonify(_serialize(row)), 201
    except pg_errors.Error as exc:
        conn.rollback()
        print(f"Error creating consultancy project: {exc}")
        return jsonify({'error': 'Failed to create project.'}), 400
    finally:
        release_db_connection(conn)


# ── PUT /<project_id> ───────────────────────────────────────────────────────────

@icsr_consultancy_bp.route('/<int:project_id>', methods=['PUT'])
@token_required
def update_project(current_user_id, project_id):
    """Edit a consultancy project's fields, industry, area, and logo."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed.'}), 503
    try:
        if not _can_manage(conn, current_user_id):
            return jsonify({'error': 'ICSR admin access required.'}), 403

        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        cur.execute(f"SELECT project_id, industry_logo FROM {TABLE} WHERE project_id = %s", (project_id,))
        existing = cur.fetchone()
        if not existing:
            return jsonify({'error': 'Project not found.'}), 404

        new_logo, err = _resolve_logo(existing['industry_logo'])
        if err:
            return jsonify({'error': err}), 400

        # COALESCE keeps the existing value whenever a field is omitted/blank.
        # Numeric/date params are cast so COALESCE can match the column type.
        set_parts, params = [], []
        for f in _TEXT_FIELDS:
            set_parts.append(f"{f} = COALESCE(%s, {f})")
            params.append(_clean(request.form.get(f)))
        for f in _NUMERIC_FIELDS:
            set_parts.append(f"{f} = COALESCE(%s::numeric, {f})")
            params.append(_clean(request.form.get(f)))
        for f in _DATE_FIELDS:
            set_parts.append(f"{f} = COALESCE(%s::date, {f})")
            params.append(_clean(request.form.get(f)))
        set_parts.append("industry_logo = %s")
        params.append(new_logo)

        cur.execute(
            f"UPDATE {TABLE} SET {', '.join(set_parts)} "
            f"WHERE project_id = %s RETURNING {', '.join(_COLUMNS)}",
            (*params, project_id),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        return jsonify(_serialize(row)), 200
    except pg_errors.Error as exc:
        conn.rollback()
        print(f"Error updating consultancy project: {exc}")
        return jsonify({'error': 'Failed to update project.'}), 400
    finally:
        release_db_connection(conn)
