-- Migration: add industry sponsorship columns to icsr_sponsered_projects
-- Captures the sponsoring industry, that industry's logo, and the project's
-- area/domain — surfaced on the Research → ICSR sponsored-projects views.
-- Mirrors add_icsr_consultancy_industry_columns.sql for the consultancy table.
-- Idempotent — safe to re-run.
-- Run with: psql -h <host> -U <user> -d <db> -f Database_Schema/migrations/add_icsr_sponsored_industry_columns.sql

BEGIN;

-- sponsered_industry — name of the industry/company that sponsored the project
-- industry_logo      — external logo URL OR server path /uploads/industry/<file>
-- project_area       — area / domain of the project (e.g. "Materials", "AI/ML")
ALTER TABLE public.icsr_sponsered_projects ADD COLUMN IF NOT EXISTS sponsered_industry varchar(200);
ALTER TABLE public.icsr_sponsered_projects ADD COLUMN IF NOT EXISTS industry_logo      text;
ALTER TABLE public.icsr_sponsered_projects ADD COLUMN IF NOT EXISTS project_area       varchar(200);

COMMIT;

-- Note: the shared set_last_updated() trigger (trg_icsr_sponsered_projects_last_updated)
-- already covers this table — no new trigger needed. All three columns are nullable, so the
-- existing CSV upload pipeline (UPDATABLE_TABLES['icsr_sponsered_projects']) auto-accepts
-- them with no backend change required.
