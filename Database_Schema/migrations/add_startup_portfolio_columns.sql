-- Migration: add showcase/display columns to iptif_startup_table and techin_startup_table
-- Powers the public "Startup Portfolio" showcase card on the Innovation & Entrepreneurship page.
-- Idempotent — safe to re-run.
-- Run with: psql -h <host> -U <user> -d <db> -f Database_Schema/migrations/add_startup_portfolio_columns.sql

BEGIN;

-- startup_logo                  — external logo URL OR server path /uploads/startups/<file>
-- startup_website_link          — the startup's public website
-- startup_founder_name          — founder / co-founder name shown on the card
-- startup_founder_profile_line  — founder profile link (LinkedIn etc.)
-- startup_summary               — "what they do" — clamped on the card, full in the detail overlay
-- startup_tagline               — short slogan shown under the title
-- is_published                  — only published startups appear on the public portfolio
ALTER TABLE public.iptif_startup_table  ADD COLUMN IF NOT EXISTS startup_logo                 text;
ALTER TABLE public.iptif_startup_table  ADD COLUMN IF NOT EXISTS startup_website_link         text;
ALTER TABLE public.iptif_startup_table  ADD COLUMN IF NOT EXISTS startup_founder_name         varchar(200);
ALTER TABLE public.iptif_startup_table  ADD COLUMN IF NOT EXISTS startup_founder_profile_line text;
ALTER TABLE public.iptif_startup_table  ADD COLUMN IF NOT EXISTS startup_summary              text;
ALTER TABLE public.iptif_startup_table  ADD COLUMN IF NOT EXISTS startup_tagline              varchar(300);
ALTER TABLE public.iptif_startup_table  ADD COLUMN IF NOT EXISTS is_published                 boolean NOT NULL DEFAULT false;

ALTER TABLE public.techin_startup_table ADD COLUMN IF NOT EXISTS startup_logo                 text;
ALTER TABLE public.techin_startup_table ADD COLUMN IF NOT EXISTS startup_website_link         text;
ALTER TABLE public.techin_startup_table ADD COLUMN IF NOT EXISTS startup_founder_name         varchar(200);
ALTER TABLE public.techin_startup_table ADD COLUMN IF NOT EXISTS startup_founder_profile_line text;
ALTER TABLE public.techin_startup_table ADD COLUMN IF NOT EXISTS startup_summary              text;
ALTER TABLE public.techin_startup_table ADD COLUMN IF NOT EXISTS startup_tagline              varchar(300);
ALTER TABLE public.techin_startup_table ADD COLUMN IF NOT EXISTS is_published                 boolean NOT NULL DEFAULT false;

-- Partial indexes to keep the public "WHERE is_published" portfolio query fast.
CREATE INDEX IF NOT EXISTS idx_iptif_startup_table_published
    ON public.iptif_startup_table (is_published) WHERE is_published;
CREATE INDEX IF NOT EXISTS idx_techin_startup_table_published
    ON public.techin_startup_table (is_published) WHERE is_published;

COMMIT;

-- Note: the shared set_last_updated() trigger already covers both startup tables
-- (trg_iptif_startup_table_last_updated / trg_techin_startup_table_last_updated) —
-- no new trigger needed. Both tables remain uploadable via the existing CSV pipeline,
-- so these new (nullable) columns are auto-accepted by the "Upload Startups" flow.
