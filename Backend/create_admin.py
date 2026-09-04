#!/usr/bin/env python3
"""
One-time bootstrap: creates the first admin account for a fresh deployment.

There is no public signup route and no seeded admin in the schema (by
design — see docs/SECURITY_IMPROVEMENT.md, finding C2). Without this script
the only way to get a working login on a brand-new database is to hand-write
a bcrypt hash and INSERT it, which is error-prone and tempts someone to
"temporarily" reopen public signup instead. This runs locally with direct
DB access, is never exposed over HTTP, and ships no credential in the repo.

Usage:
    cd Backend/
    python create_admin.py --email admin@iitpkd.ac.in [--username admin] [--password ...]

If --password is omitted you'll be prompted for it (input hidden). Email,
username, and password can also come from ADMIN_EMAIL / ADMIN_USERNAME /
ADMIN_PASSWORD env vars for unattended/container bootstrapping.

Refuses to run if an admin (role_id = 3) already exists — after the first
admin exists, create every subsequent account through the admin-only
/auth/create-user endpoint instead. Pass --force to bypass this and create
another admin anyway.
"""
import argparse
import getpass
import os
import sys

from dotenv import load_dotenv

load_dotenv()

from flask_bcrypt import generate_password_hash  # noqa: E402 (after load_dotenv)
from app.db import get_db_connection, release_db_connection  # noqa: E402


def parse_args():
    parser = argparse.ArgumentParser(description='Create the first admin account.')
    parser.add_argument('--email', default=os.environ.get('ADMIN_EMAIL'))
    parser.add_argument('--username', default=os.environ.get('ADMIN_USERNAME'))
    parser.add_argument('--password', default=os.environ.get('ADMIN_PASSWORD'))
    parser.add_argument('--force', action='store_true',
                         help='Create the account even if an admin already exists.')
    return parser.parse_args()


def main():
    args = parse_args()

    email = (args.email or input('Admin email: ')).strip()
    if not email:
        print("Email is required.")
        sys.exit(1)

    password = args.password or getpass.getpass('Admin password (min 8 chars): ')
    if not password or len(password) < 8:
        print("Password must be at least 8 characters.")
        sys.exit(1)

    username = (args.username or '').strip() or None

    conn = get_db_connection()
    if not conn:
        print("Could not connect to the database. Check DATABASE_URL in Backend/.env.")
        sys.exit(1)

    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) AS cnt FROM users WHERE role_id = 3;")
        existing_admins = cur.fetchone()['cnt']
        if existing_admins and not args.force:
            print(
                f"{existing_admins} admin account(s) already exist. Create additional "
                "users via /auth/create-user from an existing admin session instead, "
                "or re-run this script with --force to create another one anyway."
            )
            sys.exit(1)

        hashed = generate_password_hash(password).decode('utf-8')
        cur.execute(
            """
            INSERT INTO users (email, password_hash, username, display_name, role_id, status)
            VALUES (%s, %s, %s, %s, 3, 'active')
            RETURNING id, email;
            """,
            (email, hashed, username, username),
        )
        new_user = cur.fetchone()
        conn.commit()
        print(f"Admin account created: {new_user['email']} (id={new_user['id']})")
    except Exception as e:
        conn.rollback()
        print(f"Failed to create admin: {e}")
        sys.exit(1)
    finally:
        cur.close()
        release_db_connection(conn)


if __name__ == '__main__':
    main()
