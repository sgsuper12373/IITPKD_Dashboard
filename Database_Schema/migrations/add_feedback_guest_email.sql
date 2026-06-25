-- Migration: let guests submit feedback with a manually entered email
-- Originally the feedback OTP flow keyed everything off the logged-in user's
-- account email (user_id NOT NULL). Guests (the shared guest account and fully
-- unauthenticated visitors) now type their own email and verify it via OTP, so
-- the verification row must store that email and tolerate a missing user_id.
-- Idempotent — safe to re-run.
-- Run with: psql -h <host> -U <user> -d <db> -f Database_Schema/migrations/add_feedback_guest_email.sql

BEGIN;

-- The email the OTP was sent to. Authoritative source for the relayed payload;
-- the client never re-supplies it after /start.
ALTER TABLE public.feedback_verification
    ADD COLUMN IF NOT EXISTS email TEXT;

-- Anonymous guests have no user row, so user_id may be NULL going forward.
ALTER TABLE public.feedback_verification
    ALTER COLUMN user_id DROP NOT NULL;

-- Rate limiting is now keyed by destination email rather than user_id.
CREATE INDEX IF NOT EXISTS idx_feedback_verif_email ON public.feedback_verification (email);

COMMIT;
