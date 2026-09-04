-- The account-lockout logic in Backend/app/auth.py (login()) reads and writes
-- users.last_failed_at, but the column was never added to schema_dump.sql or
-- any prior migration — every login attempt fails with UndefinedColumn on a
-- database created from the current schema dump. Run this against any
-- existing database that predates this fix; new databases created from
-- schema_dump.sql already have the column.
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_at timestamp with time zone;
