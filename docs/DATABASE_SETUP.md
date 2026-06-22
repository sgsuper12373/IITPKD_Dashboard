# Database Setup — IITPKD Dashboard

The full database schema (tables, types, enums, sequences, constraints) lives in a single file:

```
Database_Schema/schema_dump.sql
```

This file was generated with `pg_dump --schema-only` and is the **single source of truth** for the database structure.

---

## Prerequisites

| Requirement | Minimum version |
|-------------|-----------------|
| PostgreSQL   | 16+             |
| `psql` CLI   | Included with PostgreSQL |
| Python       | 3.10+           |
| python-dotenv | `pip install python-dotenv` |

---

## Quick Start (recommended)

### 1 — Create a fresh database

```bash
createdb iitpkd_dashboard
# or via psql:
psql -c "CREATE DATABASE iitpkd_dashboard;"
```

### 2 — Configure your connection

Copy and fill in `Backend/.env`:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>
JWT_SECRET_KEY=<your-secret-key>
```

### 3 — Run the setup script

```bash
cd Backend/
python setup_database.py
```

The script will restore all tables, types, and constraints from the dump file in a single transaction — if anything fails, it rolls back cleanly.

**Optional:** Pass the URL directly (skips `.env`):

```bash
python setup_database.py --db-url postgresql://user:pass@localhost/iitpkd_dashboard
```

---

## Manual Setup (via psql)

If you prefer to run it yourself:

```bash
psql \
  --single-transaction \
  --no-owner \
  --file Database_Schema/schema_dump.sql \
  postgresql://user:pass@localhost/iitpkd_dashboard
```

`--single-transaction` ensures everything rolls back on error.  
`--no-owner` skips `OWNER TO` statements so you don't need a `postgres` superuser role.

---

## Updating the Dump

Whenever you change the schema on your local machine, regenerate the dump to keep the file up to date:

```bash
pg_dump \
  --schema-only \
  --no-owner \
  --no-acl \
  --file Database_Schema/schema_dump.sql \
  postgresql://user:pass@localhost/iitpkd_dashboard
```

Commit the updated `schema_dump.sql` so all team members are in sync.

---

## Starting the Backend

```bash
cd Backend/
source venv/bin/activate   # or: python -m venv venv && pip install -r requirements.txt
python run.py
```

Server runs on **http://127.0.0.1:5000** by default.
