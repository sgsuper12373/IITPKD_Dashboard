-- Migration: add is_published flag to iptif_facilities_table
-- Only published facilities appear on the public IPTIF Facilities page; admins
-- manage the flag from the "Manage Facilities" view. Mirrors the is_published
-- pattern already used on iptif_startup_table / techin_startup_table.
-- Idempotent — safe to re-run.
-- Run with: psql -h <host> -U <user> -d <db> -f Database_Schema/migrations/add_facilities_is_published.sql

BEGIN;

-- is_published — only published facilities appear on the public showcase.
ALTER TABLE public.iptif_facilities_table ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

-- Backfill: keep currently-showcased facilities (those with a display_title, which
-- were already public) visible, so adding the flag doesn't hide live content.
-- New facilities still default to draft (false) until an admin publishes them.
UPDATE public.iptif_facilities_table
SET is_published = true
WHERE display_title IS NOT NULL AND is_published = false;

-- Partial index to keep the public "WHERE is_published" query fast.
CREATE INDEX IF NOT EXISTS idx_iptif_facilities_published
    ON public.iptif_facilities_table (is_published) WHERE is_published;

COMMIT;

-- Note: the shared set_last_updated() trigger already covers iptif_facilities_table —
-- no new trigger needed.
