#!/usr/bin/env python3
"""
Database setup script for IITPKD Dashboard.

Restores the full database schema (tables, types, constraints, sequences)
from the pg_dump file at Database_Schema/schema_dump.sql.

Usage:
    cd Backend/
    python setup_database.py [--db-url postgresql://user:pass@host/dbname]

If --db-url is omitted, DATABASE_URL from .env is used.
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv

try:
    # Windows consoles default to a legacy codepage (e.g. cp1252) that can't
    # encode the ✅/❌ used below, which crashes the script on its own
    # success message after the restore already succeeded. Force UTF-8 where
    # supported; harmless no-op on stdout that's already UTF-8 or can't be
    # reconfigured (e.g. some CI redirect targets).
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except (AttributeError, ValueError):
    pass

SCRIPT_DIR = Path(__file__).parent
DUMP_FILE  = SCRIPT_DIR.parent / 'Database_Schema' / 'schema_dump.sql'

load_dotenv()


def parse_args():
    parser = argparse.ArgumentParser(description='Set up IITPKD Dashboard database from pg_dump.')
    parser.add_argument('--db-url', help='PostgreSQL connection URL (overrides DATABASE_URL in .env)')
    return parser.parse_args()


def main():
    args = parse_args()
    db_url = args.db_url or os.environ.get('DATABASE_URL')

    if not db_url:
        print("❌  No database URL found. Set DATABASE_URL in Backend/.env or pass --db-url.")
        sys.exit(1)

    if not DUMP_FILE.is_file():
        print(f"❌  Dump file not found: {DUMP_FILE}")
        sys.exit(1)

    print("=" * 60)
    print("  IITPKD Dashboard — Database Setup")
    print("=" * 60)
    print(f"  Source : {DUMP_FILE.resolve()}")
    print(f"  Target : {db_url.split('@')[-1]}")   # hide credentials in output
    print("=" * 60)

    # psql is the canonical way to restore a pg_dump (plain-text format).
    # --single-transaction: rolls back everything on any error.
    # --no-owner: skips OWNER TO statements (avoids role-not-found errors).
    cmd = [
        'psql',
        '-v', 'ON_ERROR_STOP=1',
        '--single-transaction',
        '--file', str(DUMP_FILE.resolve()),
        db_url,
    ]

    result = subprocess.run(cmd, text=True, capture_output=True)

    if result.returncode != 0:
        print("\n❌  Setup failed. psql output:")
        print(result.stderr)
        sys.exit(1)

    if result.stderr:
        # psql prints notices/warnings to stderr even on success
        print("\n⚠️  Notices from psql (non-fatal):")
        for line in result.stderr.splitlines()[:20]:
            print(f"   {line}")

    print("\n✅  Database setup complete!")
    print("   All tables, types, and constraints have been restored.")
    print("   You can now start the backend server: python run.py")


if __name__ == '__main__':
    main()
