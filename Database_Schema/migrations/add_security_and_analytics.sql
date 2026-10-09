-- Migration: security audit log + anonymous page-view analytics
-- Idempotent — safe to re-run.
-- Run with: psql -h <host> -U <user> -d <db> -f Database_Schema/migrations/add_security_and_analytics.sql
--
-- Two tables with deliberately different privacy properties:
--   security_events : identifiable (raw IP, email) — admin-only, purged after SECURITY_LOG_RETENTION_DAYS (default 90).
--   page_views      : anonymous (daily-salted IP hash, random session id) — purged after ANALYTICS_RETENTION_DAYS (default 180).
-- Purging runs lazily inside the app (app/security_log.py, at most once a day per worker).

BEGIN;

CREATE TABLE IF NOT EXISTS public.security_events (
    id           bigserial PRIMARY KEY,
    occurred_at  timestamptz NOT NULL DEFAULT now(),
    event_type   text        NOT NULL,
    severity     text        NOT NULL CHECK (severity IN ('info', 'warning', 'high')),
    ip_address   text,
    user_agent   text,
    method       text,
    endpoint     text,
    status_code  integer,
    user_id      integer,      -- no FK: events must outlive a deleted user
    email        text,
    detail       text
);

CREATE INDEX IF NOT EXISTS idx_security_events_time      ON public.security_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type_time ON public.security_events (event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_time   ON public.security_events (ip_address, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user_time ON public.security_events (user_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.page_views (
    id            bigserial PRIMARY KEY,
    viewed_at     timestamptz NOT NULL DEFAULT now(),
    session_id    text        NOT NULL,   -- random per browser tab session, never linked to a user
    visitor_hash  text,                   -- HMAC(secret, utc_date|ip), truncated; changes daily, not reversible
    event_type    text        NOT NULL DEFAULT 'pageview' CHECK (event_type IN ('pageview', 'click')),
    path          text        NOT NULL,
    from_path     text,
    target        text,                   -- click target label, e.g. 'keep-exploring'
    is_campus     boolean                 -- NULL when CAMPUS_IP_RANGES is not configured
);

CREATE INDEX IF NOT EXISTS idx_page_views_time         ON public.page_views (viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session_time ON public.page_views (session_id, viewed_at);
CREATE INDEX IF NOT EXISTS idx_page_views_path_time    ON public.page_views (path, viewed_at DESC);

COMMIT;
