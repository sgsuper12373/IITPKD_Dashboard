# Security Review — IITPKD Dashboard

**Date:** 2026-06-21
**Scope:** Flask backend (`Backend/app/`), React/Vite frontend (`Frontend/src/`), configuration, and dependencies.
**Method:** Manual source review of authentication, authorization, data-access, file-upload, and configuration code, plus pattern scans for SQL injection, XSS, secret handling, and dangerous functions.

This document lists security issues and hardening suggestions. Each item has a location, the impact, and a concrete recommendation. Nothing here has been changed in the code — this is an assessment only.

---

## Severity summary

| Severity | Count | Items |
|----------|-------|-------|
| 🔴 Critical | 3 | C1, C2, C3 |
| 🟠 High | 6 | H1–H6 |
| 🟡 Medium | 8 | M1–M8 |
| 🔵 Low | 6 | L1–L6 |
| ⚪ Informational / Good practice | — | see end |

---

## 🔴 Critical

### C1 — CSV upload endpoint can wipe/overwrite ~45 core tables with no role check
**Location:** `Backend/app/upload.py:504-506` (`/api/upload-csv`)

The endpoint is protected only by `@token_required`. It never checks the caller's `role_id`. Any authenticated user can:
- bulk **upsert** into ~45 whitelisted tables (`UPDATABLE_TABLES`, lines 23-74), and
- for tables whose conflict key is not in the CSV, the code runs `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` and re-inserts (`upload.py:846-847`) — i.e. **destroys all existing rows** of `student_table`, `employees`, `placement_summary`, research/innovation tables, etc.

Compare with every other write module (`icsr_consultancy.py:54`, `iptif_facilities.py:47`, `mou_partners.py:20`, `startup_portfolio.py:56`) — those *do* gate writes on `role_id`. The upload path is the one destructive endpoint that does not.

**Impact:** Full integrity/availability compromise of the entire institutional dataset by any logged-in account. Because of C2/C3 below, "any logged-in account" effectively means "anyone on the internet."

**Fix:** Add an explicit admin/role check (reuse `_require_admin` or a dedicated upload-role set) at the top of `upload_csv`, exactly as the other modules do. Consider separating "upsert" from "truncate-and-replace" behind an even stricter permission.

---

### C2 — Public self-registration is open and grants an immediately-usable token
**Location:** `Backend/app/auth.py:104-137` (`/auth/signup`)

`/auth/signup` requires no authentication and returns a working JWT in its response (`auth.py:128`). New rows default to `role_id = 1` and `status = 'pending_verification'` (`Database_Schema/schema_dump.sql:1428-1431`), but **nothing enforces the verification step** — see C3. So anyone can create an account and immediately call authenticated endpoints (including C1's upload).

**Impact:** Removes the "authentication" barrier in front of every `@token_required` endpoint, including the destructive CSV upload. Also enables account/resource spam.

**Fix:** Decide whether public signup should exist at all. If not, remove the route or gate it behind admin. If it must stay, require email verification before the account is usable, and never hand back a usable token for an unverified account.

---

### C3 — Account `status` is never enforced at login
**Location:** `Backend/app/auth.py:140-175` (login), `auth.py:80-97` (`token_optional`), `auth.py:57-77` (`token_required`)

`login()` selects `status` (`auth.py:151`) but never checks it. `decode_auth_token` / `token_required` decode the JWT and trust it without re-loading the user, so `status` values like `pending_verification`, `suspended`, or `disabled` have **no effect** — such users authenticate and operate normally. Likewise a user who is later deactivated keeps full access until their (long-lived, see H2) token expires.

**Impact:** The intended verification/suspension lifecycle is not actually enforced; combined with C2 it means unverified self-registered users are fully active.

**Fix:** In `login()` (and ideally on every authenticated request) reject any user whose `status` is not `active`. For revocation to be immediate, re-check the user row server-side per request or maintain a token denylist (see H2).

---

## 🟠 High

### H1 — Flask runs with `debug=True`
**Location:** `Backend/run.py:7` — `app.run(debug=True, port=5000)`

If this process is ever reachable beyond localhost, the Werkzeug interactive debugger allows **arbitrary code execution** through the in-browser console, and every error returns a full stack trace. `flask-debugtoolbar` is also in `requirements.txt`, which must never be enabled in production.

**Fix:** Drive `debug` from an env var defaulting to `False`. Serve via a production WSGI server (gunicorn — already noted in `requirements.txt`) rather than `app.run`. Ensure `flask-debugtoolbar` is dev-only.

### H2 — Long-lived JWTs (30 days) with no revocation and client-only logout
**Location:** `Backend/app/auth.py:24-37` (token mints `exp = now + 30 days`, despite the docstring saying "24 hours"), `Frontend/src/App.jsx:159-160` (logout just removes the token from `localStorage`).

A stolen token is valid for 30 days; logout does not invalidate it server-side, and there is no `jti`/denylist. There is no refresh-token model.

**Fix:** Shorten access-token lifetime (e.g. 15–60 min) with a refresh token, or add a server-side revocation list / token-version column checked per request. Align the docstring with the real value.

### H3 — No rate limiting on authentication or upload; account lockout not implemented
**Location:** `Backend/app/auth.py` (login/signup/google/guest), `Backend/app/upload.py`

There is no rate limiting anywhere (verified — no `flask-limiter` or custom throttle). `login()` resets `failed_login_attempts = 0` on success (`auth.py:161`) but **never increments it on failure**, so the existing column and any lockout intent are inert.

**Impact:** Password brute-force, credential stuffing, signup spam, and upload abuse are all unthrottled.

**Fix:** Add `flask-limiter` (per-IP and per-account) on `/auth/*` and `/api/upload-csv`. Implement real lockout/backoff using `failed_login_attempts` + a lockout timestamp.

### H4 — Internal error details returned to clients (`str(e)`)
**Location:** `Backend/app/auth.py:357, 389, 420, 470`; `Backend/app/export_db.py:29, 75, 115`; `Backend/app/upload.py:961` (returns `error: str(e)`).

Several handlers return `jsonify({'message': str(e)})` / `{'error': str(e)}` to the caller, leaking database constraint names, schema details, and internal exception text.

**Fix:** Return a generic message to the client; log the detail server-side only.

### H5 — No upload size limit; entire file read into memory
**Location:** `Backend/app/upload.py:546` (`file.stream.read()`); no `MAX_CONTENT_LENGTH` configured (verified absent in `__init__.py`).

A large upload is fully buffered in memory with no cap, enabling memory-exhaustion DoS. File-type validation is only a `.csv` filename suffix check (`upload.py:523`).

**Fix:** Set `app.config['MAX_CONTENT_LENGTH']` (e.g. a few MB), stream/iterate the CSV rather than `read()`-ing it whole, and validate content-type, not just the extension.

### H6 — Wide-open CORS (`origins: "*"`)
**Location:** `Backend/app/__init__.py:27-33`

CORS allows any origin with `Authorization` headers. Authentication is Bearer-token (not cookies), so classic CSRF risk is limited, but there is no origin allow-list, so any website can script requests against the API.

**Fix:** Restrict `origins` to the known frontend domain(s) per environment.

---

## 🟡 Medium

### M1 — `JWT_SECRET_KEY` not configured; app falls back to an ephemeral random key
**Location:** `Backend/app/__init__.py:18-23`; `Backend/.env` contains only `DATABASE_URL` (no `JWT_SECRET_KEY`, despite `README.md:76` instructing to set it).

With no secret set, a new random key is generated per process start. All tokens silently invalidate on every restart, and under multiple workers (gunicorn) each worker signs with a different key, so tokens fail intermittently. The app only prints a warning rather than refusing to start.

**Fix:** Require `JWT_SECRET_KEY` (fail fast if missing in production) and set a strong value in `.env`. Keep it stable across restarts/workers.

### M2 — Google login accepts *any* Google account and auto-provisions it
**Location:** `Backend/app/auth.py:185-257`

The token signature/audience/issuer/email-verified checks are correct, but there is no allow-list — any Google account is accepted and auto-created with `role_id = 0`. For an institutional dashboard this likely should be limited (e.g. `@iitpkd.ac.in`, or pre-provisioned users only).

**Fix:** Restrict by hosted domain (`hd` claim / email suffix) or to pre-existing users; don't silently create accounts for arbitrary Google identities.

### M3 — User/email enumeration via distinct responses
**Location:** `Backend/app/auth.py:154-158` returns `404 "Email not found."` vs `401 "Incorrect password."`; signup (`auth.py:131-133`) and `create_user` (`auth.py:449-451`) reveal whether an email/username already exists.

**Fix:** Return a single generic "Invalid email or password" with a uniform status code for login failures.

### M4 — No security response headers
**Location:** `Backend/app/__init__.py:106-127` (`after_request` sets only cache headers).

Missing `X-Content-Type-Options`, `X-Frame-Options`/CSP `frame-ancestors`, `Referrer-Policy`, and (behind TLS) `Strict-Transport-Security`. No Content-Security-Policy.

**Fix:** Add these headers in `after_request` (or via a proxy). A CSP meaningfully reduces the impact of any XSS (see M5/L4).

### M5 — Auth token stored in `localStorage`
**Location:** `Frontend/src/App.jsx:123-160` and ~30 components read `localStorage.getItem('authToken')`.

`localStorage` is readable by any JavaScript running on the page, so any XSS yields token theft, and the 30-day lifetime (H2) makes a stolen token valuable.

**Fix:** Prefer an httpOnly, Secure, SameSite cookie for the token, or at minimum pair short token lifetimes (H2) with a strict CSP (M4) to contain XSS impact.

### M6 — No password strength policy; email format not validated
**Location:** `Backend/app/auth.py:104-111` (signup), `auth.py:426-445` (create_user), `auth.py:476-494` (update_user).

bcrypt hashing is correct, but any password (including empty-after-strip nuances and 1-char passwords) is accepted, and `email-validator` is in `requirements.txt` but not used to validate input.

**Fix:** Enforce a minimum length/complexity; validate email format server-side.

### M7 — Sensitive data (incl. potential Aadhaar) written to stdout logs
**Location:** `Backend/app/upload.py:839` (`print(f"Full Row: {row}")`), and other verbose `print` blocks (e.g. 413, 657-707) that dump CSV rows/columns and user IDs.

`student_table` includes an `aadhar_number` column; on validation errors entire rows are printed to stdout, exposing PII in logs.

**Fix:** Remove row-content logging or redact sensitive fields; use a structured logger with appropriate levels rather than `print`, and never log full record payloads.

### M8 — `create_user` closes a pooled connection instead of releasing it
**Location:** `Backend/app/auth.py:454` — `conn.close()` (every other handler uses `release_db_connection(conn)`).

Closing a connection that came from `ThreadedConnectionPool` removes it from rotation without returning it, slowly exhausting the pool (`maxconn=20`, `db.py:15`) and causing eventual denial of service.

**Fix:** Use `release_db_connection(conn)` in the `finally` block.

---

## 🔵 Low / Hardening

### L1 — Dynamic SQL via f-strings (reviewed: not currently injectable, but fragile)
**Location:** widespread, e.g. `export_db.py:49,109`, `upload.py:95,847`, and the `*_stats`/`*_module` files.

These interpolate **server-side constants** (table-name constants, `ORIGINS[...]['table']`, `build_filter_query` output) — user values are passed as parameters (`%s`). `build_filter_query` (`iar_stats.py:21-42`) builds conditions from a fixed column `mapping`, not raw input, and `export_db`/`truncate` validate the table name against `information_schema` before interpolating. **No SQL injection was found.** However, the pattern is one careless edit away from a vulnerability.

**Fix (defense-in-depth):** Use `psycopg2.sql.Identifier`/`sql.SQL` for table/column identifiers instead of f-string interpolation.

### L2 — `dangerouslySetInnerHTML` with currently-constant data
**Location:** `Frontend/src/components/IptifSection.jsx:655,675`, `TechinSection.jsx:623,641`, `ResearchLibrarySection.jsx:188,310`.

The injected `icon`/`label` values are hardcoded HTML-entity strings in component source (e.g. `'&#128202;'`), not API/DB data, so there is no XSS today. The concern is purely that the sink exists — if any of these are later wired to backend/user data it becomes stored XSS.

**Fix:** Render emoji/entities as plain text/JSX, or sanitize, so the dangerous sink is removed entirely.

### L3 — Database connection has no `sslmode`
**Location:** `Backend/.env` `DATABASE_URL` (currently `localhost:5432`, no `sslmode`).

Fine for a local DB, but if the DB is ever remote the connection (and credentials) travel unencrypted by default.

**Fix:** Add `sslmode=require` (or stronger) for any non-local database.

### L4 — Guest login relies on shared credentials in env
**Location:** `Backend/app/auth.py:264-301` (`GUEST_USER_NAME` / `GUEST_USER_PASSWORD`).

A shared guest account is a reasonable pattern, but ensure the guest role is strictly read-only (it must not be able to reach C1's upload or any write endpoint) and that these credentials are strong and rotated.

**Fix:** Confirm the guest `role_id` cannot satisfy any write/upload authorization; keep guest strictly read-only.

### L5 — Static file routes serve user-uploaded content from the app
**Location:** `Backend/app/__init__.py:52-66` (`send_from_directory` for logos/facilities/startups/industry).

`send_from_directory` (Werkzeug ≥3) is safe against path traversal. The residual risk is serving attacker-influenced files (e.g. an uploaded SVG with script) from the same origin.

**Fix:** Force a download/`Content-Disposition` or a separate origin/CDN for user uploads; validate uploaded image types; consider `X-Content-Type-Options: nosniff` (see M4).

### L6 — `update_user` may throw on non-string password; admins can self-demote
**Location:** `Backend/app/auth.py:492` (`data['password'].strip()` assumes a string), and role updates have no guard against removing the last admin.

**Fix:** Validate input types; prevent operations that would leave zero admins.

---

## ⚪ Things done well (keep these)

- Passwords hashed with **bcrypt** (`flask-bcrypt`); hashes stripped from responses.
- JWT decoding **pins `algorithms=['HS256']`** (`auth.py:47`) — not vulnerable to `alg=none`/algorithm-confusion.
- Google ID tokens are verified with signature, audience, issuer, and `email_verified` checks (`auth.py:197-210`).
- User-supplied **values** are consistently passed as query parameters (`%s`) — no SQL injection found.
- CSV upload **whitelists** target tables (`UPDATABLE_TABLES`) and derives column names from `information_schema`, not raw input.
- Most write endpoints (`icsr_*`, `iptif_facilities`, `mou_partners`, `startup_portfolio`) correctly enforce `role_id` (the gap is the upload endpoint, C1).
- `.env` files are **gitignored** and not committed; no secrets found in the repo, schema dumps, or seeds.
- Destructive `truncate_table` requires admin **plus password re-verification** (`export_db.py:99-109`).

---

## Suggested remediation order

1. **C1** — add a role check to `/api/upload-csv` (stops dataset wipe). *Highest priority.*
2. **C2 / C3** — close public registration or enforce verification + `status` at login.
3. **H1** — disable Flask debug; deploy under gunicorn.
4. **M1 / H2** — set a stable `JWT_SECRET_KEY`; shorten token lifetime + add revocation.
5. **H3** — rate limiting + real account lockout on `/auth/*` and uploads.
6. **H4 / M7** — stop leaking `str(e)` to clients and PII to logs.
7. **H5 / H6 / M4 / M5** — upload size cap, CORS allow-list, security headers, token storage.
8. Work through the remaining Medium/Low items as hardening.
