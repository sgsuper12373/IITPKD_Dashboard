-- Migration: feedback OTP + CAPTCHA verification state
-- Backs the email-OTP + math-CAPTCHA gate in front of the feedback form.
-- Holds only short-lived verification state (NOT feedback content — that is
-- relayed on to the Google Sheet by the backend). Idempotent — safe to re-run.
-- Run with: psql -h <host> -U <user> -d <db> -f Database_Schema/migrations/add_feedback_verification.sql

BEGIN;

CREATE TABLE IF NOT EXISTS public.feedback_verification (
    verification_id TEXT PRIMARY KEY,                      -- random token, returned to the client
    user_id         INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    otp_hash        TEXT    NOT NULL,                       -- bcrypt hash of the 6-digit code
    captcha_answer  INTEGER NOT NULL,                       -- expected answer to the math challenge
    attempts        INTEGER NOT NULL DEFAULT 0,             -- failed OTP/CAPTCHA tries
    consumed        BOOLEAN NOT NULL DEFAULT FALSE,         -- single-use: TRUE once submitted
    expires_at      TIMESTAMPTZ NOT NULL,                   -- code validity window (e.g. now + 10 min)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Look up a user's recent rows (rate-limiting + cleanup).
CREATE INDEX IF NOT EXISTS idx_feedback_verif_user       ON public.feedback_verification (user_id);
-- Prune expired rows efficiently.
CREATE INDEX IF NOT EXISTS idx_feedback_verif_expires_at ON public.feedback_verification (expires_at);

COMMIT;
