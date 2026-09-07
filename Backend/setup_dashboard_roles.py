#!/usr/bin/env python3
"""
Creates (or updates the grants for) the two read-only Postgres roles behind
the dashboard's least-privilege view containment:

    dashboard_reader        SELECT on employees_dashboard_view,
                             students_dashboard_view, and every other
                             already-public table. No grant on employees or
                             student_table.

    dashboard_reader_admin  The same, plus SELECT on employees_admin_view /
                             students_admin_view (adds appointed_category /
                             original_category / pwd_status). Still no grant
                             on the base employees / student_table tables —
                             even management reads through a view here.

Run Database_Schema/migrations/add_dashboard_views.sql FIRST — this script
grants on views that must already exist.

Usage (from Backend/):
    python setup_dashboard_roles.py

Connects using DATABASE_URL from .env, which must be a role with permission
to CREATE ROLE and GRANT/REVOKE on the target tables (e.g. the table owner).

Idempotent: safe to re-run. An existing role's password is never reset by
a re-run — only a brand-new role gets a freshly generated password. Grants
are always re-applied (harmless if already in place).

The generated passwords and ready-to-use connection URLs are printed ONCE,
to the terminal only — this script never writes them to a file. Copy them
into your .env as READONLY_DATABASE_URL / READONLY_ADMIN_DATABASE_URL
immediately; if you lose them, re-run with --reset-password for the role
in question (see --help).
"""
import argparse
import os
import secrets
import sys
from urllib.parse import urlparse, urlunparse

import psycopg2
from dotenv import load_dotenv

load_dotenv()

ROLES = {
    'dashboard_reader': {
        'views': ['employees_dashboard_view', 'students_dashboard_view'],
        'env_var': 'READONLY_DATABASE_URL',
    },
    'dashboard_reader_admin': {
        'views': ['employees_admin_view', 'students_admin_view'],
        'env_var': 'READONLY_ADMIN_DATABASE_URL',
    },
}

RESTRICTED_TABLES = ['employees', 'student_table']


def parse_args():
    parser = argparse.ArgumentParser(
        description='Create/update the dashboard_reader and dashboard_reader_admin read-only roles.'
    )
    parser.add_argument('--db-url', help='Admin/owner connection URL (overrides DATABASE_URL in .env)')
    parser.add_argument(
        '--reset-password', choices=list(ROLES.keys()), action='append', default=[],
        help='Force a new random password for this role even if it already exists. Repeatable.'
    )
    return parser.parse_args()


def role_exists(cur, role_name):
    cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s;", (role_name,))
    return cur.fetchone() is not None


def build_connection_url(admin_url, role_name, password):
    """Same host/port/dbname/query as admin_url, with the role's own credentials."""
    parsed = urlparse(admin_url)
    netloc = f"{role_name}:{password}@{parsed.hostname}"
    if parsed.port:
        netloc += f":{parsed.port}"
    return urlunparse(parsed._replace(netloc=netloc))


def main():
    args = parse_args()
    admin_url = args.db_url or os.environ.get('DATABASE_URL')

    if not admin_url:
        print("ERROR: No database URL found. Set DATABASE_URL in Backend/.env or pass --db-url.")
        sys.exit(1)

    print("=" * 70)
    print("  Dashboard read-only roles setup")
    print("=" * 70)

    conn = psycopg2.connect(admin_url)
    conn.autocommit = True
    cur = conn.cursor()

    generated = {}

    try:
        for role_name, cfg in ROLES.items():
            exists = role_exists(cur, role_name)
            force_reset = role_name in args.reset_password

            if not exists:
                password = secrets.token_urlsafe(24)
                cur.execute(
                    f'CREATE ROLE "{role_name}" WITH LOGIN PASSWORD %s;',
                    (password,)
                )
                generated[role_name] = password
                print(f"  Created role: {role_name}")
            elif force_reset:
                password = secrets.token_urlsafe(24)
                cur.execute(
                    f'ALTER ROLE "{role_name}" WITH PASSWORD %s;',
                    (password,)
                )
                generated[role_name] = password
                print(f"  Reset password for existing role: {role_name}")
            else:
                print(f"  Role already exists (password unchanged): {role_name}")

            # USAGE on the schema is a prerequisite for seeing anything in it
            # at all — some Postgres setups don't grant this to PUBLIC by
            # default, in which case every unqualified query resolves to
            # "relation does not exist" rather than a permission error,
            # which is confusing to debug. Grant it explicitly rather than
            # relying on a default that varies by environment.
            cur.execute(f'GRANT USAGE ON SCHEMA public TO "{role_name}";')

            # Grant-then-narrow: everything the dashboard already reads
            # freely stays readable by default; only the two named tables
            # need an explicit carve-out. Re-running these is always safe.
            #
            # IMPORTANT: "ALL TABLES IN SCHEMA public" also matches every
            # OTHER role's admin-only views, since they're just more tables
            # in the same schema — a blanket grant would silently hand the
            # public role read access to the management-only fields it
            # exists to withhold. Revoke every view that isn't this specific
            # role's own, in addition to the two base tables, to close that.
            cur.execute(f'GRANT SELECT ON ALL TABLES IN SCHEMA public TO "{role_name}";')

            for table in RESTRICTED_TABLES:
                cur.execute(f'REVOKE SELECT ON "{table}" FROM "{role_name}";')

            other_roles_views = {
                view
                for other_role, other_cfg in ROLES.items()
                if other_role != role_name
                for view in other_cfg['views']
            }
            for view in other_roles_views:
                cur.execute(f'REVOKE SELECT ON "{view}" FROM "{role_name}";')

            for view in cfg['views']:
                cur.execute(f'GRANT SELECT ON "{view}" TO "{role_name}";')

            print(f"    -> granted: all public tables + {', '.join(cfg['views'])}")
            revoked = RESTRICTED_TABLES + sorted(other_roles_views)
            print(f"    -> revoked: {', '.join(revoked)}")

        print("\n" + "=" * 70)
        if generated:
            print("  Add these to your .env (shown ONCE — not saved anywhere by this script):")
            print("=" * 70)
            for role_name, password in generated.items():
                env_var = ROLES[role_name]['env_var']
                url = build_connection_url(admin_url, role_name, password)
                print(f"\n{env_var}={url}")
        else:
            print("  No new passwords generated (both roles already existed).")
            print("  Use --reset-password dashboard_reader / dashboard_reader_admin")
            print("  if you need to recover a lost password.")
        print("\n" + "=" * 70)
        print("  Done. Restart the backend after updating .env.")
        print("=" * 70)

    finally:
        cur.close()
        conn.close()


if __name__ == '__main__':
    main()
