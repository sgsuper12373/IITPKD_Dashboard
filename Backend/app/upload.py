"""
CSV upload endpoint: secure bulk-upsert to any whitelisted database table.

Security: table name is validated against UPDATABLE_TABLES before any DB
interaction. Column names come from information_schema, not raw user input.
"""
import csv
import hashlib
import io
import secrets
import traceback

import psycopg2
import psycopg2.extras
from psycopg2 import sql
from flask import Blueprint, jsonify, request

from .auth import token_required, _require_role
from .db import get_db_connection, release_db_connection
from . import limiter

upload_bp = Blueprint('upload', __name__)

# Maps allowed table name → its unique/conflict key column(s) for ON CONFLICT.
# Extend this list whenever a new table should be uploadable.
UPDATABLE_TABLES = {
    # Core
    'department':                   ['deptcode'],
    'alumni':                       ['sl_no'],
    'employees':                    ['id'],
    'courses_table':                ['course_code', 'senate_number'],
    'student_table':                ['roll_no_current'],
    # Grievance / Welfare
    'externship_info':              ['externid'],
    'igrs_yearwise':                ['grievance_year'],
    'icc_yearwise':                 ['complaints_year'],
    'ewd_yearwise':                 ['ewd_year'],
    'faculty_engagement':           ['engagement_code'],
    # Placement
    'placement_summary':            ['placement_year', 'program', 'gender', 'branch'],
    'placement_companies':          ['company_id'],
    'placement_packages':           ['placement_year', 'program'],
    # Research
    'icsr_sponsered_projects':      ['project_id'],
    'icsr_consultancy_projects':    ['project_id'],
    'icsr_csr':                     ['csr_id'],
    'research_mous':                ['mou_id'],
    'research_patents':             ['patent_id'],
    'research_publications':        ['id'],
    # Innovation
    'innovation_projects':          ['project_title', 'year_started'],
    'iptif_startup_table':          ['id'],
    'iptif_program_table':          ['id'],
    'iptif_projects_table':         ['project_id'],
    'iptif_facilities_table':       ['facility_id'],
    'techin_startup_table':         ['id'],
    'techin_program_table':         ['id'],
    'techin_skill_development_program': ['id'],
    # Industry Connect
    'industry_events':              ['project_id'],
    'industry_conclave':            ['conclave_id'],
    # Outreach
    'open_house':                   ['event_year', 'event_date'],
    'uba_projects':                 ['project_id'],
    'uba_events':                   ['id'],
    'outreach':                     ['id'],
    'outreach_science_quest':       ['id'],
    'outreach_math_circle':         ['id'],
    'outreach_pale_blue_dot':       ['id'],
    'outreach_institute_visits':    ['id'],
    'outreach_nss_activities':      ['id'],
    'nptel_courses':                ['id'],
    # Rankings
    'nirf_ranking':                 ['year'],
    # IAR
    'iar_mous':                     ['id'],
}


# Role_ids allowed to view a table's upload schema / perform its upload,
# beyond role 3 (master admin, who can always upload every table — every
# tuple below includes it explicitly rather than relying on an implicit
# bypass). This mirrors Frontend/src/utils/rolePermissions.js's
# SECTION_PERMISSIONS exactly, table-for-table, so a role the frontend shows
# an upload button to is the same role the backend actually accepts it
# from — keep the two in sync when either changes. A table with no entry
# here (no dedicated frontend section owns it) defaults to (3,) via
# _table_upload_roles() below: master-admin-only, safe by default.
TABLE_UPLOAD_ROLES = {
    'employees':                        (3, 2),   # Administration Section
    'externship_info':                  (3, 2),
    'faculty_engagement':               (3, 2),
    'courses_table':                    (3, 4),   # Academic Section
    'student_table':                    (3, 4),
    'igrs_yearwise':                    (3, 7),   # IGRC
    'icc_yearwise':                     (3, 8),   # ICC
    'ewd_yearwise':                     (3, 6),   # EWD
    'iar_mous':                         (3, 5),   # IAR
    'placement_summary':                (3, 11),  # CDC / Placements
    'placement_companies':              (3, 11),
    'placement_packages':               (3, 11),
    'icsr_sponsered_projects':          (3, 9),   # ICSR
    'icsr_consultancy_projects':        (3, 9),
    'industry_events':                  (3, 9),
    'research_mous':                    (3, 9),
    'research_patents':                 (3, 9),
    'research_publications':            (3, 10),  # Library
    'innovation_projects':              (3, 13, 14),  # TechIn + IPTIF (shared base table)
    'iptif_startup_table':              (3, 14),  # IPTIF
    'iptif_program_table':              (3, 14),
    'iptif_projects_table':             (3, 14),
    'iptif_facilities_table':           (3, 14),
    'techin_startup_table':             (3, 13),  # TechIn
    'techin_program_table':             (3, 13),
    'techin_skill_development_program': (3, 13),
    'industry_conclave':                (3, 12),  # IAC
    'open_house':                       (3, 15),  # Open House
    'uba_projects':                     (3, 17),  # UBA
    'uba_events':                       (3, 17),
    'nptel_courses':                    (3, 16),  # CCE
    'outreach_science_quest':           (3, 18),  # Science Quest
    'outreach_math_circle':             (3, 19),  # PMC
    'outreach_pale_blue_dot':           (3, 20),  # PBD
    'outreach_institute_visits':        (3, 21),  # Institute Visits
    'outreach_nss_activities':          (3, 22),  # NSS
    # department, alumni, icsr_csr, outreach (bare), nirf_ranking:
    # intentionally absent — no dedicated frontend section claims these,
    # so they stay master-admin-only via the default below.
}


def _table_upload_roles(table_name):
    """Allowed role_ids for uploading to `table_name` — defaults to
    master-admin-only for any table not explicitly listed in
    TABLE_UPLOAD_ROLES, so a new UPDATABLE_TABLES entry is safe by default
    rather than accidentally open to everyone."""
    return TABLE_UPLOAD_ROLES.get(table_name, (3,))


# Boolean-ish columns that accept Yes/No/True/False/1/0 and get normalised
# to Postgres TRUE/FALSE before insert.
BOOL_COLUMN_NAMES = {'pwd', 'is_active', 'is_from_iitpkd', 'pwd_exs',
                      'certification_earned', 'is_top_recruiter', 'isactive'}

# Columns that are always system-managed timestamps (set by the database
# itself — DEFAULT now()/CURRENT_TIMESTAMP — never something a user fills
# in), regardless of which table they're on. Confirmed against every table
# in UPDATABLE_TABLES: 'last_updated' is present (DEFAULT now()) on all 41
# of them, and 'created_at'/'createddate'/'modifieddate' appear on ~10 with
# the same DEFAULT now()/CURRENT_TIMESTAMP pattern — no table has a
# same-named column that's meant to accept a user-supplied date. Treated
# identically to a SERIAL column below: excluded from what the CSV is asked
# to provide, and silently ignored (not inserted) if a CSV includes one
# anyway, rather than letting a supplied value fake the row's history.
SYSTEM_MANAGED_COLUMNS = {'last_updated', 'created_at', 'createddate', 'modifieddate'}

# Tables where the 'id' primary key is generated by CSV pre-processing
# (a deterministic hash/concatenation of other columns) rather than being
# either a DB SERIAL or a value the user is expected to supply. Kept here so
# both the pre-processors below and the /upload-schema endpoint agree on the
# same list — a user should never be told to fill in 'id' for these tables.
AUTO_GENERATED_ID_TABLES = {'employees', 'iar_mous', 'research_publications', 'outreach'}

# Extra columns required (beyond whatever the DB itself enforces) to generate
# research_publications' deterministic id. Single source of truth shared by
# _preprocess_research_publications and the /upload-schema endpoint.
RESEARCH_PUB_ID_FIELDS = ('publication_title', 'publication_year', 'faculty_name', 'publication_type')

# Extra columns required (beyond whatever the DB itself enforces) to generate
# outreach's deterministic id — 'created_by'/'createdby' is checked separately
# since either spelling is accepted. Shared by _preprocess_outreach_typed and
# the /upload-schema endpoint.
OUTREACH_ID_FIELDS = ('academic_year', 'program_type', 'start_date', 'end_date')

# Maps (table_name, postgres_constraint_name) -> a plain-English explanation
# of the business rule that was violated. Covers every CHECK constraint in
# the schema (Database_Schema/schema_dump.sql) that a CSV upload could hit.
# A constraint not in this map still gets a readable (if generic) fallback —
# see _friendly_check_violation.
CHECK_CONSTRAINT_MESSAGES = {
    ('ewd_yearwise', 'check_non_negativity'):
        "'Annual Electricity Consumption', 'Per Capita Electricity Consumption', "
        "'Per Capita Water Consumption', 'Per Capita Recycled Water' and 'Green Coverage' "
        "must all be zero or greater.",
    ('icc_yearwise', 'check_pending_non_negative'): "'Complaints Pending' cannot be negative.",
    ('icc_yearwise', 'check_resolved_non_negative'): "'Complaints Resolved' cannot be negative.",
    ('icc_yearwise', 'check_total_equals_sum'):
        "'Total Complaints' must equal 'Complaints Resolved' plus 'Complaints Pending'.",
    ('icc_yearwise', 'check_total_non_negative'): "'Total Complaints' cannot be negative.",
    ('igrs_yearwise', 'check_pending_non_negative'): "'Grievances Pending' cannot be negative.",
    ('igrs_yearwise', 'check_resolved_non_negative'): "'Grievances Resolved' cannot be negative.",
    ('igrs_yearwise', 'check_total_equals_sum'):
        "'Total Grievances Filed' must equal 'Grievances Resolved' plus 'Grievances Pending'.",
    ('igrs_yearwise', 'check_total_non_negative'): "'Total Grievances Filed' cannot be negative.",
    ('open_house', 'open_house_num_departments_check'): "'Number of Departments' cannot be negative.",
    ('open_house', 'open_house_total_visitors_check'): "'Total Visitors' cannot be negative.",
    ('placement_companies', 'placement_company_non_negative'): "'Offers' and 'Hires' cannot be negative.",
    ('placement_packages', 'placement_packages_check'):
        "Package values cannot be negative, 'Highest Package' must be greater than or equal to "
        "'Lowest Package', and 'Average Package' must fall between the two.",
    ('placement_summary', 'placement_summary_check'): "'Placed' cannot be greater than 'Registered'.",
    ('placement_summary', 'placement_summary_placed_check'): "'Placed' cannot be negative.",
    ('placement_summary', 'placement_summary_registered_check'): "'Registered' cannot be negative.",
}


def _friendly_check_violation(table_name, constraint_name):
    """Plain-English explanation for a CHECK constraint violation."""
    msg = CHECK_CONSTRAINT_MESSAGES.get((table_name, constraint_name))
    if msg:
        return msg
    return (f"This row breaks a data rule ('{constraint_name}'). "
            "Please check that the related numeric fields are consistent with each other.")


def _friendly_row_exception(exc, table_name):
    """
    Converts a psycopg2 exception raised while inserting a single row into a
    (reason, column_or_None) pair safe to show a non-technical user.
    """
    if isinstance(exc, psycopg2.errors.CheckViolation):
        constraint = getattr(exc.diag, 'constraint_name', None) or 'unknown'
        return _friendly_check_violation(table_name, constraint), None
    if isinstance(exc, psycopg2.errors.UniqueViolation):
        return "A row with the same key already exists (duplicate entry).", None
    if isinstance(exc, psycopg2.errors.ForeignKeyViolation):
        col = getattr(exc.diag, 'column_name', None)
        return "This row refers to a record that does not exist. Check related IDs/codes.", col
    if isinstance(exc, psycopg2.errors.NotNullViolation):
        col = getattr(exc.diag, 'column_name', None)
        return (f"'{col}' cannot be empty." if col else "A required value is missing."), col
    if isinstance(exc, psycopg2.errors.InvalidTextRepresentation):
        return ("A value does not match the expected type for its column "
                "(e.g. text where a number or date is expected)."), None
    if isinstance(exc, psycopg2.errors.DatatypeMismatch):
        return "A value's type does not match its column (check numbers, dates and true/false fields).", None
    if isinstance(exc, psycopg2.errors.StringDataRightTruncation):
        return "A value is too long for its column.", None
    return "This row could not be saved due to a data error.", None


def _get_enum_columns(cur, table_name):
    """
    Returns {column_name_lower: [allowed values in declared order]} for every
    column of `table_name` whose SQL type is a Postgres ENUM. Read-only,
    fully parameterised — safe to call with any string.
    """
    try:
        cur.execute(
            """
            SELECT c.column_name, e.enumlabel
            FROM information_schema.columns c
            JOIN pg_type t ON t.typname = c.udt_name
            JOIN pg_namespace n ON n.oid = t.typnamespace AND n.nspname = c.udt_schema
            JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE c.table_schema = 'public' AND LOWER(c.table_name) = LOWER(%s)
            ORDER BY c.column_name, e.enumsortorder;
            """,
            (table_name,)
        )
        enums = {}
        for row in cur.fetchall():
            enums.setdefault(row['column_name'].lower(), []).append(row['enumlabel'])
        return enums
    except Exception as e:
        print(f"Enum lookup failed for table '{table_name}': {e}")
        return {}


def safe_rollback(conn):
    """Safely rolls back a connection that may already be closed."""
    if conn and not conn.closed:
        try:
            conn.rollback()
        except (psycopg2.InterfaceError, AttributeError):
            pass


MAX_DIAGNOSE_ROWS = 2000   # cap on how many rows we retry individually
MAX_DIAGNOSE_ERRORS = 50   # cap on how many per-row errors we report at once


def _diagnose_failing_rows(cur, conn, query, data, use_truncate, table_name):
    """
    Retries insertion row-by-row inside savepoints to identify every CSV row
    that fails (up to MAX_DIAGNOSE_ERRORS), so the user can fix everything in
    one pass instead of resubmitting once per bad row. All changes are rolled
    back afterwards — this is diagnostic only; the real insert already failed.

    Returns (errors, truncated) where errors is a list of
    {'row': i, 'reason': str, 'column': str?} dicts.
    """
    errors, truncated = [], False
    try:
        cur.execute("SAVEPOINT _diag_start")
        if use_truncate:
            cur.execute(
                sql.SQL('TRUNCATE TABLE {} RESTART IDENTITY CASCADE;').format(sql.Identifier(table_name))
            )
        scan_limit = min(len(data), MAX_DIAGNOSE_ROWS)
        if len(data) > MAX_DIAGNOSE_ROWS:
            truncated = True
        for i, row in enumerate(data[:scan_limit], start=1):
            cur.execute("SAVEPOINT _diag_row")
            try:
                psycopg2.extras.execute_values(cur, query, [row])
                cur.execute("RELEASE SAVEPOINT _diag_row")
            except Exception as row_err:
                cur.execute("ROLLBACK TO SAVEPOINT _diag_row")
                cur.execute("RELEASE SAVEPOINT _diag_row")
                reason, column = _friendly_row_exception(row_err, table_name)
                entry = {'row': i, 'reason': reason}
                if column:
                    entry['column'] = column
                errors.append(entry)
                if len(errors) >= MAX_DIAGNOSE_ERRORS:
                    truncated = True
                    break
        cur.execute("ROLLBACK TO SAVEPOINT _diag_start")
        cur.execute("RELEASE SAVEPOINT _diag_start")
    except Exception:
        safe_rollback(conn)
    return errors, truncated


def _handle_db_error(cur, conn, query, data, use_truncate, table_name, fallback_message, status_code=400):
    """
    Shared handler for the psycopg2 exception blocks in upload_csv: runs the
    row-by-row diagnostic and returns a response listing every failing row it
    found, falling back to a single friendly message if none could be
    isolated (e.g. the failure isn't reproducible row-by-row).
    """
    errors, truncated = _diagnose_failing_rows(cur, conn, query, data, use_truncate, table_name)
    if errors:
        return jsonify({
            'message': f"{len(errors)} row(s) could not be saved — see details below.",
            'error_type': 'row_database_errors',
            'details': errors,
            'truncated': truncated,
        }), status_code
    return jsonify({'message': fallback_message, 'error_type': 'database_error'}), status_code


# ---------------------------------------------------------------------------
# Per-table pre-processing helpers
# ---------------------------------------------------------------------------

def _preprocess_employees(reader, csv_headers):
    """
    For the 'employees' table:
    - Renames 'group' → 'group_name' (reserved SQL word).
    - Drops any existing 'id' column and auto-generates it as
      empid+designation+doj. Deliberately excludes 'dor': it's the conflict
      key for the upsert, so if 'dor' were part of it, filling it in later
      (an employee getting relieved after their first upload) would change
      the id and insert a second row instead of updating the existing one.
    - Normalises date columns from DD/MM/YY to YYYY-MM-DD.

    Returns (new_headers, processed_rows, error) — rows as a plain list of dicts
    so the caller can use them directly without re-reading the original stream.
    """
    DATE_COLS = {'dob', 'initial_doj', 'doj', 'dor', 'notificationdate'}

    def _norm_date(val):
        if not val or not val.strip():
            return val
        val = val.strip()
        if len(val) == 10 and val[4] == '-':
            return val  # Already ISO
        parts = val.replace('-', '/').split('/')
        if len(parts) == 3:
            day, month, year = parts
            if len(year) == 2:
                yr = int(year)
                year = str(2000 + yr) if yr <= 30 else str(1900 + yr)
            return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        return val

    rows = list(reader)
    if not rows:
        return None, None, 'CSV file is empty.'

    new_headers = ['id'] + [
        'group_name' if h.lower() == 'group' else h
        for h in csv_headers if h.lower() != 'id'
    ]

    processed = []
    for row in rows:
        new_row = {}
        for k, v in row.items():
            if k.lower() == 'id':
                continue
            key = 'group_name' if k.lower() == 'group' else k
            new_row[key] = _norm_date(v) if key.lower() in DATE_COLS else v

        empid = (new_row.get('empid') or '').strip()
        desig  = (new_row.get('designation') or '').strip()
        doj    = (new_row.get('doj') or '').strip()
        new_row['id'] = f"{empid}{desig}{doj}"
        processed.append(new_row)

    return _rebuild_stream(new_headers, processed)


def _preprocess_student_table(reader, csv_headers):
    """
    For the 'student_table':
    Renames human-readable CSV column names to their snake_case database equivalents.
    """
    RENAME_MAP = {
        'aadhar number':                      'aadhar_number',
        'preparatory ay':                     'preparatory_ay',
        'withdrawn/ terminated':              'withdrawn_terminated',
        'date of withdrawal/ termination':    'date_of_withdrawal_termination',
        'ay of withdrawal/ termination':      'ay_of_withdrawal_termination',
        'reason for withdrawal/ termination': 'reason_for_withdrawal_termination',
    }

    needs_rename = any(h.lower() in RENAME_MAP for h in csv_headers)
    if not needs_rename:
        return reader, csv_headers, None

    rows = list(reader)
    new_headers = [RENAME_MAP.get(h.lower(), h) for h in csv_headers]

    processed = []
    for row in rows:
        new_row = {}
        for old_key, val in row.items():
            new_key = RENAME_MAP.get(old_key.lower(), old_key)
            new_row[new_key] = val
        processed.append(new_row)

    return _rebuild_stream(new_headers, processed)


def _preprocess_uba_events(reader, csv_headers):
    """
    For the 'uba_events' table:
    Converts start_date / end_date from DD-MM-YYYY or DD/MM/YYYY to YYYY-MM-DD.
    """
    from datetime import datetime

    DATE_COLS = {'start_date', 'end_date'}
    DATE_FMTS = ('%d-%m-%Y', '%d/%m/%Y', '%Y-%m-%d', '%m/%d/%Y')

    def _parse_date(val):
        if not val or not str(val).strip():
            return val
        s = str(val).strip()
        for fmt in DATE_FMTS:
            try:
                return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
            except ValueError:
                continue
        return s  # return as-is if unparseable; DB will raise a proper error

    rows = list(reader)
    if not rows:
        return None, None, 'CSV file is empty.'

    processed = []
    for row in rows:
        new_row = dict(row)
        for col in DATE_COLS:
            if col in new_row:
                new_row[col] = _parse_date(new_row[col])
        processed.append(new_row)

    return _rebuild_stream(csv_headers, processed)



def _preprocess_nptel_enrollments(reader, csv_headers, conn):
    """
    For the 'nptel_enrollments' table:
    Accepts 'course_code' in CSV and resolves it to 'course_id' via DB lookup.
    """
    if 'course_code' not in csv_headers:
        return reader, csv_headers, None

    rows = list(reader)
    if not rows:
        return None, None, 'CSV file is empty.'

    codes = [r.get('course_code', '').strip() for r in rows if r.get('course_code')]

    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(
            "SELECT course_id, course_code, offering_year, offering_semester FROM nptel_courses WHERE course_code = ANY(%s)",
            (codes,)
        )
        lookup = {
            (r['course_code'].strip(), str(r['offering_year']), (r['offering_semester'] or '').strip()): r['course_id']
            for r in cur.fetchall()
        }
    finally:
        cur.close()

    new_headers = [h for h in csv_headers if h != 'course_code']
    if 'course_id' not in new_headers:
        new_headers.append('course_id')

    missing, processed = [], []
    for row in rows:
        code = row.pop('course_code', '').strip()
        year = row.get('enrollment_year', '').strip()
        sem  = row.get('enrollment_semester', '').strip()
        cid  = lookup.get((code, year, sem))
        if cid:
            row['course_id'] = cid
        elif code:
            missing.append(f"{code} ({year} {sem})")
        processed.append(row)

    if missing:
        return None, None, (
            f"Could not find course_id for: {', '.join(missing[:5])}. "
            "Ensure NPTEL Courses are uploaded first."
        )

    return _rebuild_stream(new_headers, processed)


def _preprocess_research_publications(reader, csv_headers):
    """
    For the 'research_publications' table:
    Auto-generates a deterministic `id` (MD5 hex, 32 chars) from the
    concatenation of:
        publication_title | journal_name | department |
        faculty_name | publication_year | publication_type
    This ensures natural deduplication across uploads — users never supply `id`.
    """
    rows = list(reader)
    if not rows:
        return None, None, 'CSV file is empty.'

    lower_headers = [h.lower() for h in csv_headers]
    for col in RESEARCH_PUB_ID_FIELDS:
        if col not in lower_headers:
            return None, None, (
                f"CSV is missing '{col}' column, which is required to generate the record id."
            )

    # Prepend id, strip any user-supplied id column
    new_headers = ['id'] + [h for h in csv_headers if h.lower() != 'id']

    processed = []
    for row in rows:
        new_row = {k: v for k, v in row.items() if k.lower() != 'id'}

        title   = (new_row.get('publication_title') or '').strip().lower()
        journal = (new_row.get('journal_name')      or '').strip().lower()
        dept    = (new_row.get('department')         or '').strip().lower()
        fac     = (new_row.get('faculty_name')       or '').strip().lower()
        year    = (new_row.get('publication_year')   or '').strip()
        ptype   = (new_row.get('publication_type')   or '').strip().lower()

        hash_input = f"{title}|{journal}|{dept}|{fac}|{year}|{ptype}"
        new_row['id'] = hashlib.md5(hash_input.encode('utf-8')).hexdigest()
        processed.append(new_row)

    return _rebuild_stream(new_headers, processed)


def _rebuild_stream(headers, rows):
    """Serialises processed rows back into a DictReader-ready StringIO stream."""
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=headers)
    writer.writeheader()
    writer.writerows(rows)
    buf.seek(0)
    reader = csv.DictReader(buf)
    return reader, reader.fieldnames, None


# Maps outreach alias table names → the canonical program_name to inject
_OUTREACH_PROGRAM_NAMES = {
    'outreach_science_quest':    'Science Quest',
    'outreach_math_circle':      'Palakkad Math Circle',
    'outreach_pale_blue_dot':    'Pale Blue Dot',
    'outreach_institute_visits': 'Institute Visits',
    'outreach_nss_activities':   'NSS Activities',
}


def _preprocess_outreach_typed(reader, csv_headers, program_name):
    """
    Inject `program_name` into every row, ensure mandatory ID fields exist,
    and generate a deterministic composite `id`.
    """
    rows = list(reader)
    if not rows:
        return None, None, 'CSV file is empty.'

    # Normalize headers
    lower_headers = [h.lower() for h in csv_headers]
    
    # 1. Inject program_name if not already present or needs overriding
    if 'program_name' not in lower_headers:
        csv_headers = list(csv_headers) + ['program_name']
        lower_headers.append('program_name')

    # 2. Check for required ID fields
    # Note: program_name is now guaranteed.
    # User mentioned 'createdby' - we'll look for both created_by and createdby.
    for f in OUTREACH_ID_FIELDS:
        if f not in lower_headers:
            return None, None, f"Missing required column for ID generation: {f}"
    
    # Check for created_by / createdby
    has_created_by = 'created_by' in lower_headers or 'createdby' in lower_headers
    if not has_created_by:
        return None, None, "Missing required column for ID generation: created_by"

    # Add id to headers if not present
    if 'id' not in lower_headers:
        csv_headers = ['id'] + list(csv_headers)
    elif csv_headers[0].lower() != 'id':
        # Move id to front for consistency
        csv_headers = ['id'] + [h for h in csv_headers if h.lower() != 'id']

    processed = []
    for row in rows:
        # Normalize keys in the row dict to access them easily
        norm_row = {k.lower(): v for k, v in row.items()}
        
        # Override program_name if we are in a 'typed' upload
        if program_name:
            row['program_name'] = program_name
            norm_row['program_name'] = program_name

        ay    = (norm_row.get('academic_year') or '').strip()
        cb    = (norm_row.get('created_by') or norm_row.get('createdby') or '').strip()
        pn    = (norm_row.get('program_name') or '').strip()
        pt    = (norm_row.get('program_type') or '').strip()
        sd    = (norm_row.get('start_date') or '').strip()
        ed    = (norm_row.get('end_date') or '').strip()

        if not all([ay, cb, pn, pt, sd, ed]):
            missing = [f for f, v in [('academic_year', ay), ('created_by', cb), ('program_name', pn), 
                                      ('program_type', pt), ('start_date', sd), ('end_date', ed)] if not v]
            return None, None, f"Row with missing ID components ({', '.join(missing)}): {row}"

        # Generate ID: Concatenation (using pipe to avoid ambiguity)
        # academic_year | created_by | program_name | program_type | start_date | end_date
        row['id'] = f"{ay}|{cb}|{pn}|{pt}|{sd}|{ed}"
        
        # Ensure 'created_by' key exists (normalize 'createdby' if it was used)
        if 'createdby' in row and 'created_by' not in row:
            row['created_by'] = row.pop('createdby')

        processed.append(row)

    return _rebuild_stream(csv_headers, processed)


def _preprocess_faculty_engagement(reader, csv_headers):
    """
    For the 'faculty_engagement' table:
    Strips 'created_at' if present in the CSV to ensure the database auto-generates it.
    """
    rows = list(reader)
    if not rows:
        return None, None, 'CSV file is empty.'

    new_headers = [h for h in csv_headers if h.lower() != 'created_at']
    
    processed = []
    for row in rows:
        new_row = {k: v for k, v in row.items() if k.lower() != 'created_at'}
        processed.append(new_row)

    return _rebuild_stream(new_headers, processed)


def _preprocess_iar_mous(reader, csv_headers):
    """
    For the 'iar_mous' table:
    Auto-generates a deterministic `id` (MD5 hex) from the concatenation of:
        partner_name | framework | country | collaboration_nature | date_signed | validity_end
    Also converts dates to YYYY-MM-DD if needed.
    """
    from datetime import datetime
    rows = list(reader)
    if not rows:
        return None, None, 'CSV file is empty.'

    DATE_COLS = {'date_signed', 'validity_end'}
    DATE_FMTS = ('%d-%m-%Y', '%d/%m/%Y', '%Y-%m-%d', '%m/%d/%Y')

    def _parse_date(val):
        if not val or not str(val).strip():
            return val
        s = str(val).strip()
        for fmt in DATE_FMTS:
            try:
                return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
            except ValueError:
                continue
        return s

    lower_headers = [h.lower() for h in csv_headers]
    new_headers = ['id'] + [h for h in csv_headers if h.lower() != 'id']

    processed = []
    for row in rows:
        new_row = {k: v for k, v in row.items() if k.lower() != 'id'}
        
        # Parse Dates
        for col in DATE_COLS:
            key_exact = next((k for k in new_row.keys() if k.lower() == col), None)
            if key_exact:
                new_row[key_exact] = _parse_date(new_row[key_exact])

        pn = (new_row.get(next((k for k in new_row if k.lower() == 'partner_name'), '')) or '').strip().lower()
        fw = (new_row.get(next((k for k in new_row if k.lower() == 'framework'), '')) or '').strip().lower()
        cy = (new_row.get(next((k for k in new_row if k.lower() == 'country'), '')) or '').strip().lower()
        cn = (new_row.get(next((k for k in new_row if k.lower() == 'collaboration_nature'), '')) or '').strip().lower()
        ds = (new_row.get(next((k for k in new_row if k.lower() == 'date_signed'), '')) or '').strip()
        ve = (new_row.get(next((k for k in new_row if k.lower() == 'validity_end'), '')) or '').strip()

        hash_input = f"{pn}|{fw}|{cy}|{cn}|{ds}|{ve}"
        new_row['id'] = hashlib.md5(hash_input.encode('utf-8')).hexdigest()
        processed.append(new_row)

    return _rebuild_stream(new_headers, processed)


# ---------------------------------------------------------------------------
# Upload route
# ---------------------------------------------------------------------------

@upload_bp.route('/upload-csv', methods=['POST'])
@limiter.limit("20 per hour")
@token_required
def upload_csv(current_user_id):
    """
    Handles CSV → DB bulk upsert (INSERT … ON CONFLICT DO UPDATE).

    Flow:
    1. Validate table name against UPDATABLE_TABLES whitelist.
    2. Apply per-table pre-processing (FK lookups, column renames, etc.).
    3. Validate CSV headers against actual DB schema.
    4. Deduplicate rows on the conflict key.
    5. Execute bulk upsert.
    """
    if 'table_name' not in request.form:
        return jsonify({'message': 'No table_name specified.'}), 400
    if 'csv_file' not in request.files or request.files['csv_file'].filename == '':
        return jsonify({'message': 'No CSV file provided.'}), 400

    file = request.files['csv_file']
    if not file.filename.endswith('.csv'):
        return jsonify({'message': 'File is not a CSV.'}), 400

    # Validate table name against the whitelist (case-insensitive). Must
    # happen before the role check below — which roles are allowed depends
    # on which table this is.
    table_name_lower = request.form['table_name'].lower()
    table_name = next(
        (t for t in UPDATABLE_TABLES if t.lower() == table_name_lower), None
    )
    if not table_name:
        return jsonify({'message': f"Updating table '{request.form['table_name']}' is not allowed."}), 403

    conn_check = get_db_connection()
    if not conn_check:
        return jsonify({'message': 'Database connection failed.'}), 500
    try:
        cur_check = conn_check.cursor()
        if not _require_role(cur_check, current_user_id, _table_upload_roles(table_name)):
            return jsonify({'message': 'You do not have permission to upload this table.'}), 403
        cur_check.close()
    finally:
        release_db_connection(conn_check)

    # Log upload attempt
    print(f"\n{'='*80}")
    print(f"CSV UPLOAD INITIATED")
    print(f"{'='*80}")
    print(f"File: {file.filename}")
    print(f"Table: {table_name}")
    print(f"User ID: {current_user_id}")
    print(f"{'='*80}\n")

    conn = None
    try:
        csv_text = io.StringIO(file.stream.read().decode('utf-8'))
        reader   = csv.DictReader(csv_text)
        csv_headers = [h.strip() for h in reader.fieldnames] if reader.fieldnames else []
        reader.fieldnames = csv_headers
        
        # Strip BOM from the first column name if present
        if csv_headers and csv_headers[0].startswith('\ufeff'):
            original_first = csv_headers[0]
            csv_headers = [csv_headers[0].lstrip('\ufeff')] + csv_headers[1:]
            # Also update the reader's fieldnames
            reader.fieldnames = csv_headers
            print(f"\n{'='*80}")
            print(f"BOM DETECTED AND STRIPPED")
            print(f"{'='*80}")
            print(f"Original first column: {repr(original_first)}")
            print(f"Corrected first column: {repr(csv_headers[0])}")
            print(f"{'='*80}\n")
        
        if not csv_headers:
            return jsonify({'message': 'CSV file is empty or headers are missing.'}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Database connection failed.'}), 500

        # --- Per-table pre-processing ---
        # processed_rows: plain list of dicts produced by preprocessing (bypasses
        # the csv_text.seek(0) re-read in the data-collection phase below).
        error = None
        if table_name == 'employees':
            reader, csv_headers, error = _preprocess_employees(reader, csv_headers)
        elif table_name == 'student_table':
            reader, csv_headers, error = _preprocess_student_table(reader, csv_headers)
        elif table_name == 'uba_events':
            reader, csv_headers, error = _preprocess_uba_events(reader, csv_headers)
        elif table_name == 'nptel_enrollments' and 'course_code' in csv_headers:
            reader, csv_headers, error = _preprocess_nptel_enrollments(reader, csv_headers, conn)
        elif table_name == 'research_publications':
            reader, csv_headers, error = _preprocess_research_publications(reader, csv_headers)
        elif table_name == 'iar_mous':
            reader, csv_headers, error = _preprocess_iar_mous(reader, csv_headers)
        elif table_name == 'faculty_engagement':
            reader, csv_headers, error = _preprocess_faculty_engagement(reader, csv_headers)
        elif table_name == 'outreach' or table_name in _OUTREACH_PROGRAM_NAMES:
            p_name = _OUTREACH_PROGRAM_NAMES.get(table_name) # None if table_name is exactly 'outreach'
            reader, csv_headers, error = _preprocess_outreach_typed(reader, csv_headers, p_name)
            if not error:
                table_name = 'outreach'   # redirect typed aliases to physical table

        if error:
            print(f"\n{'='*80}")
            print(f"PRE-PROCESSING ERROR - Table: {table_name}")
            print(f"{'='*80}")
            print(f"Error: {error}")
            print(f"{'='*80}\n")
            return jsonify({'message': error, 'error_type': 'preprocessing_error'}), 400

        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Check the table exists
        cur.execute(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND LOWER(table_name) = LOWER(%s)) AS ok;",
            (table_name,)
        )
        if not cur.fetchone()['ok']:
            return jsonify({'message': f"Table '{table_name}' does not exist in the database."}), 400

        # Fetch column metadata
        cur.execute(
            """
            SELECT column_name, is_generated, column_default, data_type, is_nullable, character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = 'public' AND LOWER(table_name) = LOWER(%s)
            ORDER BY ordinal_position;
            """,
            (table_name,)
        )
        col_rows = cur.fetchall()

        db_columns, serial_cols, optional_cols, required_cols = [], [], [], set()
        for r in col_rows:
            if (r.get('is_generated') or 'NEVER').upper() == 'ALWAYS':
                continue
            default   = r.get('column_default') or ''
            nullable  = (r.get('is_nullable') or 'YES').upper()
            is_serial = default.startswith('nextval(')
            if is_serial or r['column_name'].lower() in SYSTEM_MANAGED_COLUMNS:
                serial_cols.append(r['column_name'])
                continue
            if default or nullable == 'YES':
                optional_cols.append(r['column_name'])
            db_columns.append(r['column_name'])
            if nullable == 'NO' and not default:
                required_cols.add(r['column_name'].lower())

        if not db_columns:
            return jsonify({'message': f"No uploadable columns found for '{table_name}'."}), 400

        csv_lower    = [h.lower() for h in csv_headers]
        db_lower     = [c.lower() for c in db_columns]
        all_db_lower = [r['column_name'].lower() for r in col_rows]

        missing = [c for c in required_cols if c not in csv_lower]
        if missing:
            # Debug logging for missing columns
            print(f"\n{'='*80}")
            print(f"COLUMN MISMATCH ERROR - Table: {table_name}")
            print(f"{'='*80}")
            print(f"Missing required columns: {missing}")
            print(f"Expected required columns: {sorted(required_cols)}")
            print(f"CSV provided columns: {csv_headers}")
            print(f"Database required columns: {sorted([c for r in col_rows if (r.get('is_nullable') or 'YES').upper() == 'NO' and not (r.get('column_default') or '') for c in [r['column_name']]])}")
            print(f"{'='*80}\n")
            # Return enhanced error response
            return jsonify({
                'message': 'CSV is missing required columns.',
                'details': {
                    'missing_in_csv': missing,
                    'required_columns': sorted(list(required_cols)),
                    'provided_columns': csv_headers,
                    'expected_required': sorted([r['column_name'] for r in col_rows if (r.get('is_nullable') or 'YES').upper() == 'NO' and not (r.get('column_default') or '')]),
                },
                'error_type': 'missing_columns',
            }), 400

        serial_lower   = [c.lower() for c in serial_cols]
        optional_lower = [c.lower() for c in optional_cols]
        extra = [
            csv_headers[i] for i, h in enumerate(csv_lower)
            if h not in all_db_lower and h not in serial_lower and h not in optional_lower
        ]
        if extra:
            # Debug logging for extra columns
            print(f"\n{'='*80}")
            print(f"COLUMN MISMATCH ERROR - Table: {table_name}")
            print(f"{'='*80}")
            print(f"Total CSV columns: {len(csv_headers)}")
            print(f"Total database columns: {len(col_rows)}")
            print(f"\nExtra/Unknown columns in CSV: {extra}")
            print(f"Number of extra columns: {len(extra)}")
            
            # Show detailed breakdown of each extra column
            print(f"\nDetailed breakdown of problematic columns:")
            for ex_col in extra:
                print(f"  - '{ex_col}' (lowercase: '{ex_col.lower()}')")
                # Try to find similar columns in database (case-insensitive)
                possible_matches = [
                    c for c in [r['column_name'] for r in col_rows]
                    if c.lower() == ex_col.lower()
                ]
                if possible_matches:
                    print(f"    -> Found in DB with different case: {possible_matches}")
                else:
                    print(f"    -> NOT found in database (even with case variations)")
            
            print(f"\nValid database columns (all {len(col_rows)}): {sorted([r['column_name'] for r in col_rows])}")
            print(f"CSV provided columns ({len(csv_headers)}): {csv_headers}")
            print(f"\nSerial/Auto-generated columns (skipped): {serial_cols}")
            print(f"Optional columns (skipped): {optional_cols}")
            print(f"Expected/Required columns: {db_columns}")
            print(f"{'='*80}\n")
            
            # Return enhanced error response
            return jsonify({
                'message': 'CSV contains columns not present in the database.',
                'details': {
                    'extra_in_csv': extra,
                    'expected_columns': db_columns,
                    'provided_columns': csv_headers,
                    'all_valid_columns': [r['column_name'] for r in col_rows],
                    'suggested_columns': [c for c in csv_headers if c.lower() not in extra],
                    'serial_columns': serial_cols,
                    'optional_columns': optional_cols,
                },
                'error_type': 'extra_columns',
            }), 400

        # Build INSERT … ON CONFLICT query
        conflict_keys = UPDATABLE_TABLES[table_name]
        columns_to_insert = [c for c in db_columns if c.lower() in csv_lower]
        conflict_keys_db  = [
            next((c for c in db_columns if c.lower() == k.lower()), k)
            for k in conflict_keys
        ]
        update_cols = [c for c in columns_to_insert if c not in conflict_keys_db]

        # Check if conflict key columns are actually present in the CSV
        conflict_keys_in_csv = [k for k in conflict_keys_db if k.lower() in csv_lower]

        cols_sql = ', '.join(f'"{c}"' for c in columns_to_insert)

        if conflict_keys_in_csv:
            # Normal upsert: conflict keys are in the CSV
            conflict_sql = ', '.join(f'"{c}"' for c in conflict_keys_db)
            conflict_action = (
                f"DO UPDATE SET {', '.join(f'{chr(34)}{c}{chr(34)} = EXCLUDED.{chr(34)}{c}{chr(34)}' for c in update_cols)}"
                if update_cols and conflict_keys_db else "DO NOTHING"
            )
            query = f'INSERT INTO "{table_name}" ({cols_sql}) VALUES %s ON CONFLICT ({conflict_sql}) {conflict_action};'
            use_truncate = False
        else:
            # Conflict keys not in CSV (e.g. auto-increment PK) — truncate and re-insert
            query = f'INSERT INTO "{table_name}" ({cols_sql}) VALUES %s;'
            use_truncate = True

        # Enum-typed columns for this table: {col_lower: [allowed values]}.
        # Fetched once per request, used to validate every cell below so a
        # typo like gender='M' is reported with the accepted values instead
        # of surfacing as an opaque DB error after insert.
        enum_cols = _get_enum_columns(cur, table_name)
        col_max_lengths = {r['column_name'].lower(): r['character_maximum_length'] for r in col_rows if r.get('character_maximum_length')}

        # Collect, normalise and validate rows.
        # `reader` is always the correct stream to use: either the original
        # DictReader (header already consumed, data rows intact) or the
        # rebuilt stream returned by a per-table pre-processor.
        #
        # Every problem found (blank required field, invalid enum value,
        # value too long) is collected into row_errors instead of returning
        # on the first one, so the user can fix everything in a single pass.
        data_iter = reader
        data, rows_processed = [], 0
        row_errors = []
        MAX_ROW_ERRORS = 100
        for i, row in enumerate(data_iter, start=1):
            row_vals, is_empty = [], True
            for col in columns_to_insert:
                val = next(
                    (row[h] for h in csv_headers if h.lower() == col.lower() and h in row),
                    row.get(col)
                )
                if val is not None and str(val).strip() == '':
                    val = None
                if val is not None:
                    is_empty = False
                row_vals.append(val)

            if is_empty:
                continue

            # Normalise booleans/aliases, then validate each cell.
            norm = list(row_vals)
            for idx, col in enumerate(columns_to_insert):
                col_l = col.lower()
                v = norm[idx]

                if v is None:
                    if col_l in required_cols and len(row_errors) < MAX_ROW_ERRORS:
                        row_errors.append({
                            'row': i, 'column': col,
                            'reason': 'This field is required and cannot be left empty.',
                        })
                    continue

                vs = str(v).strip()
                if col_l in BOOL_COLUMN_NAMES:
                    if vs.lower() in {'yes', 'y', 'true', '1'}:
                        norm[idx] = 'TRUE'
                    elif vs.lower() in {'no', 'n', 'false', '0'}:
                        norm[idx] = 'FALSE'
                    vs = str(norm[idx]).strip()
                if table_name == 'student_table' and col_l == 'program':
                    norm[idx] = vs.replace('.', '')
                    vs = str(norm[idx]).strip()
                if col_l == 'category' and vs.lower() == 'general':
                    norm[idx] = 'Gen'
                    vs = str(norm[idx]).strip()
                if table_name == 'student_table' and col_l == 'status' and vs.lower() == 'active':
                    norm[idx] = 'Ongoing'
                    vs = str(norm[idx]).strip()

                # Enum validation — after normalisation/aliasing above, so
                # 'General' having already become 'Gen' is checked as 'Gen'.
                allowed = enum_cols.get(col_l)
                if allowed is not None and vs not in allowed:
                    case_match = next((a for a in allowed if a.lower() == vs.lower()), None)
                    if case_match:
                        norm[idx] = case_match  # accept, just fix the casing
                    elif len(row_errors) < MAX_ROW_ERRORS:
                        row_errors.append({
                            'row': i, 'column': col, 'value': vs,
                            'reason': f"'{vs}' is not an accepted value for '{col}'.",
                            'allowed_values': allowed,
                        })

                # Max length validation
                max_len = col_max_lengths.get(col_l)
                if max_len is not None and len(vs) > max_len and len(row_errors) < MAX_ROW_ERRORS:
                    row_errors.append({
                        'row': i, 'column': col,
                        'value': vs[:80] + ('…' if len(vs) > 80 else ''),
                        'reason': f"This value is {len(vs)} characters long, but '{col}' allows at most {max_len}.",
                    })

            data.append(tuple(norm))
            rows_processed += 1

        if not data:
            return jsonify({'message': 'CSV contains no data rows.'}), 400

        if row_errors:
            truncated = len(row_errors) >= MAX_ROW_ERRORS
            print(f"\n{'='*80}\nROW VALIDATION ERRORS - Table: {table_name}\n"
                  f"{len(row_errors)} problem(s) found{' (truncated)' if truncated else ''}\n{'='*80}\n")
            return jsonify({
                'message': f"Found {len(row_errors)} problem(s) in your file. Fix them and re-upload.",
                'error_type': 'row_validation_errors',
                'details': row_errors,
                'truncated': truncated,
            }), 400

        # Deduplicate on conflict keys — psycopg2 cannot handle duplicates in the same INSERT
        dupes = 0
        if conflict_keys_db:
            key_indices = [
                next((i for i, c in enumerate(columns_to_insert) if c.lower() == k.lower()), None)
                for k in conflict_keys_db
            ]
            key_indices = [i for i in key_indices if i is not None]

            # Only deduplicate if we actually have some conflict key indices in the CSV
            if key_indices:
                seen, deduped = set(), []
                for row in data:
                    key = tuple(row[i] for i in key_indices)
                    if key in seen:
                        dupes += 1
                        continue
                    seen.add(key)
                    deduped.append(row)
                data = deduped
                if not data:
                    return jsonify({'message': 'No unique rows after deduplication.'}), 400

        if use_truncate:
            cur.execute(
                sql.SQL('TRUNCATE TABLE {} RESTART IDENTITY CASCADE;').format(sql.Identifier(table_name))
            )
        psycopg2.extras.execute_values(cur, query, data)
        conn.commit()

        if use_truncate:
            msg = f"Successfully replaced all data in '{table_name}' with {len(data)} rows."
        else:
            msg = f"Successfully updated {len(data)} rows in '{table_name}'."
        if dupes > 0:
            msg += f" Removed {dupes} duplicate row(s)."
        
        # Log successful upload
        print(f"\n{'='*80}")
        print(f"CSV UPLOAD SUCCESSFUL")
        print(f"{'='*80}")
        print(f"Table: {table_name}")
        print(f"Rows processed: {rows_processed}")
        print(f"Rows inserted/updated: {len(data)}")
        if dupes > 0:
            print(f"Duplicate rows removed: {dupes}")
        print(f"Columns inserted: {columns_to_insert}")
        print(f"{'='*80}\n")
        
        return jsonify({'message': msg}), 200

    except psycopg2.errors.StringDataRightTruncation as e:
        safe_rollback(conn)
        print(f"DATABASE ERROR - String Data Right Truncation | Table: {table_name} | {e}")
        return _handle_db_error(cur, conn, query, data, use_truncate, table_name,
                                 'Data too long for a column. Check field lengths.')
    except psycopg2.errors.UniqueViolation as e:
        safe_rollback(conn)
        print(f"DATABASE ERROR - Unique Violation | Table: {table_name} | {e}")
        return _handle_db_error(cur, conn, query, data, use_truncate, table_name,
                                 'Duplicate entry found. A row with the same key already exists.', 409)
    except psycopg2.errors.CheckViolation as e:
        safe_rollback(conn)
        constraint = getattr(e.diag, 'constraint_name', None) or 'unknown'
        print(f"DATABASE ERROR - Check Violation ({constraint}) | Table: {table_name} | {e}")
        return _handle_db_error(cur, conn, query, data, use_truncate, table_name,
                                 _friendly_check_violation(table_name, constraint))
    except psycopg2.errors.InvalidTextRepresentation as e:
        safe_rollback(conn)
        print(f"DATABASE ERROR - Invalid Text Representation | Table: {table_name} | {e}")
        return _handle_db_error(cur, conn, query, data, use_truncate, table_name,
                                 'Data format error. Check that values match expected types (numbers, dates, true/false).')
    except psycopg2.errors.NotNullViolation as e:
        safe_rollback(conn)
        print(f"DATABASE ERROR - Not Null Violation | Table: {table_name} | {e}")
        return _handle_db_error(cur, conn, query, data, use_truncate, table_name,
                                 'Missing required data. Ensure all required columns are filled.')
    except psycopg2.errors.DatatypeMismatch as e:
        safe_rollback(conn)
        print(f"DATABASE ERROR - Data Type Mismatch | Table: {table_name} | {e}")
        return _handle_db_error(cur, conn, query, data, use_truncate, table_name,
                                 'Data type mismatch. Check that values match column types.')
    except psycopg2.errors.ForeignKeyViolation as e:
        safe_rollback(conn)
        print(f"DATABASE ERROR - Foreign Key Violation | Table: {table_name} | {e}")
        return _handle_db_error(cur, conn, query, data, use_truncate, table_name,
                                 'Reference error. A referenced record does not exist.')
    except Exception as e:
        safe_rollback(conn)
        # A short, random reference — logged here next to the full traceback,
        # shown to the user in the response below — lets an admin grep the
        # log for this exact failure without the user ever seeing (or the
        # server ever exposing) any actual log content, stack trace, or
        # other users' data that happens to share the same log stream.
        error_ref = secrets.token_hex(4)
        print(f"GENERAL ERROR - CSV Upload | Table: {table_name} | Ref: {error_ref} | "
              f"{type(e).__name__}: {e}\n{traceback.format_exc()}")
        return jsonify({
            'message': 'An unexpected error occurred while processing your file. '
                        f'Please try again, or contact an administrator with reference {error_ref} '
                        'if this continues.',
            'error_type': 'server_error',
            'error_ref': error_ref,
        }), 500
    finally:
        if conn:
            try:
                release_db_connection(conn)
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Upload schema introspection (drives frontend templates + pre-flight checks)
# ---------------------------------------------------------------------------

@upload_bp.route('/upload-schema/<table_name>', methods=['GET'])
@limiter.limit("60 per hour")
@token_required
def get_upload_schema(current_user_id, table_name):
    """
    Returns everything the frontend needs to build an accurate upload
    template and validate a CSV before submitting it: required/optional
    columns, max lengths, and the accepted values for every enum-typed
    column — all read live from the database so it can never drift from
    what /upload-csv will actually accept.

    Gated exactly like /upload-csv (per-table role whitelist, plus the
    table-name whitelist) since it exposes column names for tables outsiders
    shouldn't be probing.
    """
    table_name_lower = table_name.lower()
    resolved_table = next(
        (t for t in UPDATABLE_TABLES if t.lower() == table_name_lower), None
    )
    if not resolved_table:
        return jsonify({'message': f"Table '{table_name}' is not available for upload."}), 403

    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed.'}), 500
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if not _require_role(cur, current_user_id, _table_upload_roles(resolved_table)):
            return jsonify({'message': 'You do not have permission to upload this table.'}), 403

        # outreach_science_quest etc. are aliases handled by pre-processing —
        # the physical table to introspect is always 'outreach'.
        physical_table = 'outreach' if resolved_table in _OUTREACH_PROGRAM_NAMES else resolved_table

        cur.execute(
            """
            SELECT column_name, is_generated, column_default, data_type,
                   is_nullable, character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = 'public' AND LOWER(table_name) = LOWER(%s)
            ORDER BY ordinal_position;
            """,
            (physical_table,)
        )
        col_rows = cur.fetchall()
        if not col_rows:
            return jsonify({'message': f"Table '{resolved_table}' does not exist in the database."}), 400

        enum_cols = _get_enum_columns(cur, physical_table)

        required, optional, serial, columns = [], [], [], []
        for r in col_rows:
            if (r.get('is_generated') or 'NEVER').upper() == 'ALWAYS':
                continue
            default = r.get('column_default') or ''
            nullable = (r.get('is_nullable') or 'YES').upper()
            is_serial = default.startswith('nextval(')
            col_name = r['column_name']
            if is_serial or col_name.lower() in SYSTEM_MANAGED_COLUMNS:
                serial.append(col_name)
                continue

            is_required = nullable == 'NO' and not default
            entry = {
                'name': col_name,
                'data_type': r.get('data_type'),
                'max_length': r.get('character_maximum_length'),
                'required': is_required,
                'allowed_values': enum_cols.get(col_name.lower()),
            }
            columns.append(entry)
            (required if is_required else optional).append(col_name)

        notes = []
        system_managed_present = sorted(
            c for c in serial if c.lower() in SYSTEM_MANAGED_COLUMNS
        )
        if system_managed_present:
            col_list = ', '.join(f"'{c}'" for c in system_managed_present)
            verb = 'is' if len(system_managed_present) == 1 else 'are'
            notes.append(
                f"{col_list} {verb} set automatically by the system — "
                "do not include it in your file."
            )

        if physical_table in AUTO_GENERATED_ID_TABLES:
            # 'id' is generated by the app from other columns — don't ask
            # the user to fill it in, don't let them override it, and don't
            # let it show up in the downloadable template either (removing
            # it from `columns` here, not just `required`, is what actually
            # keeps it out of the template — the frontend builds the
            # template header row from `columns`, not from required/optional).
            required = [c for c in required if c.lower() != 'id']
            optional = [c for c in optional if c.lower() != 'id']
            columns = [c for c in columns if c['name'].lower() != 'id']
            if 'id' not in [c.lower() for c in serial]:
                serial.append('id')
            notes.append(
                "'id' is generated automatically from other columns in your file — "
                "do not include your own id column."
            )

        if physical_table == 'research_publications':
            existing = {c.lower() for c in required}
            for f in RESEARCH_PUB_ID_FIELDS:
                if f not in existing:
                    required.append(f)
            notes.append(
                "'faculty_name' is required (in addition to the database's own rules) "
                "because it is used to generate each record's unique id."
            )

        if physical_table == 'outreach':
            existing = {c.lower() for c in required}
            for f in OUTREACH_ID_FIELDS:
                if f not in existing:
                    required.append(f)
            if 'created_by' not in existing:
                required.append('created_by')
            notes.append(
                "'created_by' (or 'createdby') is required because it is used to "
                "generate each record's unique id."
            )

        # A column promoted into `required` above shouldn't also linger in
        # `optional` (it started there because the DB itself allows NULL).
        required_lower = {c.lower() for c in required}
        optional = [c for c in optional if c.lower() not in required_lower]

        return jsonify({
            'table_name': resolved_table,
            'required_columns': required,
            'optional_columns': optional,
            'serial_columns': serial,
            'columns': columns,
            'conflict_keys': UPDATABLE_TABLES[resolved_table],
            'notes': notes,
        }), 200
    finally:
        if conn:
            try:
                release_db_connection(conn)
            except Exception:
                pass