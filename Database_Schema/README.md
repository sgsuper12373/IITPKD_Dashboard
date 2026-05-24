# Database Schema & Migrations

This folder contains the schema dump and incremental migration scripts for the IITPKD Dashboard database.

---

## Files

| File | Purpose |
|------|---------|
| `schema_dump.sql` | Full reference dump of the current schema (manual reference only) |
| `performance_migrations.sql` | Baseline performance indexes |
| `add_performance_indexes.sql` | Additional indexes for filtered queries |
| `add_mou_partner_logos.sql` | Creates the `mou_partner_logos` table for the MOU partner showcase |

---

## How to Run a Migration

### Option 1 — psql command line (recommended)

```bash
psql -h <host> -U <username> -d <database_name> -f Database_Schema/<migration_file>.sql
```

**Example** (running from the project root):

```bash
psql -h localhost -U postgres -d iitpkd_dashboard -f Database_Schema/add_mou_partner_logos.sql
```

You will be prompted for the password unless `PGPASSWORD` is set in your environment.

### Option 2 — Inside the psql terminal

Connect first:

```bash
psql -h <host> -U <username> -d <database_name>
```

Then run the file from within the session:

```sql
\i /absolute/path/to/Database_Schema/add_mou_partner_logos.sql
```

### Option 3 — pgAdmin or DBeaver

Open the migration file, paste its contents into the SQL editor for your target database, and execute.

---

## Notes

- All migration scripts are written to be **idempotent** — they use `IF NOT EXISTS` so re-running them will not cause errors or duplicate data.
- Do **not** edit `schema_dump.sql` via scripts; update it manually after applying migrations to keep it in sync with the live schema.
- Run migrations in order when setting up a fresh database:
  1. `schema_dump.sql` (base schema)
  2. `performance_migrations.sql`
  3. `add_performance_indexes.sql`
  4. `add_mou_partner_logos.sql`
