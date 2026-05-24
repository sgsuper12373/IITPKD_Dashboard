-- Migration: add mou_partner_logos table
-- Stores MOU partner logo cards shown on the /mou-collaborations page.
-- Run once on the target database. Safe to re-run (uses IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS public.mou_partner_logos (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(200) NOT NULL,
    logo_url      TEXT,
    display_order INTEGER DEFAULT 0,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
