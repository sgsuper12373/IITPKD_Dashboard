-- Migration: add showcase display columns to iptif_facilities_table
-- Powers the public IPTIF Facilities showcase page (/innovation-entrepreneurship/iptif/facilities).
-- Idempotent — safe to re-run.
-- Run with: psql -h <host> -U <user> -d <db> -f Database_Schema/migrations/add_facilities_showcase_columns.sql

BEGIN;

-- display_title     — public-facing card/heading title (separate from the internal facility_name)
-- facility_summary  — short description, reused on the card (clamped) and the detail overlay
-- image_url         — relative path of the uploaded image, e.g. /uploads/facilities/<file>
-- availing_guidance — "how to avail" instructions shown in the detail overlay
-- more_info_link    — optional external URL for more details from the facility provider
ALTER TABLE public.iptif_facilities_table ADD COLUMN IF NOT EXISTS display_title     varchar(300);
ALTER TABLE public.iptif_facilities_table ADD COLUMN IF NOT EXISTS facility_summary  text;
ALTER TABLE public.iptif_facilities_table ADD COLUMN IF NOT EXISTS image_url         text;
ALTER TABLE public.iptif_facilities_table ADD COLUMN IF NOT EXISTS availing_guidance text;
ALTER TABLE public.iptif_facilities_table ADD COLUMN IF NOT EXISTS more_info_link    text;

COMMIT;

-- Note: the existing availability_status column is reused for the detail overlay's status line.
-- The shared set_last_updated() trigger already covers iptif_facilities_table — no new trigger/index needed.
