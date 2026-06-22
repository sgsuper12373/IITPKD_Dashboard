# Feedback Form — OTP + CAPTCHA + Image Hardening Setup Guide

A complete, step-by-step runbook to set up the **secured feedback form**: only
authorized (logged-in) users can submit, and only after an **email OTP** + **math
CAPTCHA**, with **server-side image validation**. Submissions are relayed by the
Flask backend to your existing Google Sheet.

> For the Google Apps Script / Sheet specifics (the `doPost` code, Drive screenshot
> handling), see **[FEEDBACK_FORM_GUIDELINE.md](./FEEDBACK_FORM_GUIDELINE.md)**.
> This document is the end-to-end operator's runbook.

---

## 0. How it works (read this first)

```
Browser (logged-in user, JWT)                 Flask  (/api/feedback)              Google
  1. open form ───────────────► POST /start ──► email OTP via SMTP ───────────────► user inbox
                                            └─ generate math CAPTCHA + DB row
  2. enter OTP + solve CAPTCHA ► POST /verify ─► check (no consume) ─► reveal feedback fields
  3. fill feedback (+ image) ──► POST /submit ─► re-check OTP + CAPTCHA (consume once)
                                            ├─ validate + re-encode the image (Pillow)
                                            └─ relay {secret, …} ──► Apps Script ──► Sheet/Drive
```

Why each piece exists:

| Control | Stops |
| --- | --- |
| Button hidden from guests + every endpoint requires a login token | Anonymous abuse |
| Email OTP (6-digit, 10-min, single-use, rate-limited) | Bots / impersonation; ties each submission to a real inbox |
| Math CAPTCHA (server-generated + verified) | Automated scripted posting |
| Image validation by decoded type, JPEG/PNG only, re-encode | Stickers/GIFs, renamed files, EXIF/polyglot payloads |
| Apps Script **shared secret** | Direct `curl` to the public script URL (the original attack) |

---

## 1. Prerequisites

- The backend running Python venv (`Backend/venv`) and a reachable PostgreSQL
  (`DATABASE_URL` already set in `Backend/.env`).
- The frontend with `VITE_API_BASE_URL` pointing at the backend (e.g. `http://localhost:5000`).
- A Google account that owns the Feedback **Google Sheet** + its **Apps Script**.
- A mailbox to send OTP emails from. **Gmail with an App Password** is recommended for
  low volume (institute SMTP can replace it later with zero code change).

---

## 2. Backend dependencies

The image hardening uses Pillow. Install/refresh backend deps:

```bash
cd Backend
venv/bin/pip install -r requirements.txt      # adds Pillow>=10.0.0
```

Verify:

```bash
venv/bin/python -c "import PIL; print('Pillow', PIL.__version__)"
```

---

## 3. Apply the database migration

This creates `feedback_verification` (stores only short-lived OTP/CAPTCHA state — **not**
feedback content). Idempotent and additive.

```bash
psql "$DATABASE_URL" -f Database_Schema/migrations/add_feedback_verification.sql
```

(or with explicit flags)

```bash
psql -h <host> -U <user> -d <dbname> -f Database_Schema/migrations/add_feedback_verification.sql
```

Confirm the table exists:

```bash
psql "$DATABASE_URL" -c "\d feedback_verification"
```

You should see columns: `verification_id, user_id, otp_hash, captcha_answer, attempts,
consumed, expires_at, created_at`.

---

## 4. Create a Gmail App Password (OTP sender)

An App Password is a 16-character password Google issues for a single app. **The normal
account password will not work over SMTP.**

1. Use/choose a Gmail or Google Workspace account to send from (e.g. a project address).
2. Enable **2-Step Verification**: <https://myaccount.google.com/security> → *2-Step Verification* → turn on.
3. Go to **App Passwords**: <https://myaccount.google.com/apppasswords>.
4. Enter an app name like `IITPKD Dashboard` and click **Create**.
5. Copy the 16-character code shown (e.g. `abcd efgh ijkl mnop`) — you'll paste it as
   `SMTP_PASSWORD` (spaces optional, they're ignored).

> Gmail sends from a `@gmail.com`/Workspace address and is capped (~500/day) — plenty for
> feedback. For a production "official" sender, switch to institute SMTP later by changing
> only the `SMTP_*` values (no code change).

---

## 5. Set up the Google Apps Script (shared secret)

1. Open your Feedback **Google Sheet** → **Extensions ▸ Apps Script**.
2. Replace `doPost` with the **secret-guarded** version from
   **[FEEDBACK_FORM_GUIDELINE.md ▸ Step 3](./FEEDBACK_FORM_GUIDELINE.md#step-3-paste-the-apps-script-code-with-the-shared-secret-guard)**.
3. At the top, set `SHARED_SECRET` to a long random string (generate one):

   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

   Keep this value — it must match `FEEDBACK_SHARED_SECRET` in the backend `.env`.
4. **Deploy ▸ New deployment ▸ Web app**: *Execute as* **Me**, *Who has access* **Anyone**,
   then **Deploy** and **Authorize** (accept the Drive permission).
5. Copy the **Web app URL** (`https://script.google.com/macros/s/XXXXX/exec`).

> "Anyone" is required so Flask can reach it without a Google login. It's safe because the
> `SHARED_SECRET` check — not Google auth — is what gates writes.

---

## 6. Configure the backend `.env`

Edit `Backend/.env` (template: `Backend/.env.example`). Add:

```dotenv
# ── Feedback OTP email (SMTP) ──
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-sender@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM=                       # optional; defaults to SMTP_USER

# ── Feedback relay (Flask → Apps Script → Sheet) ──
FEEDBACK_SCRIPT_URL=https://script.google.com/macros/s/XXXXX/exec
FEEDBACK_SHARED_SECRET=<the same string you set as SHARED_SECRET in the Apps Script>
```

Double-check `FEEDBACK_SHARED_SECRET` is **character-for-character identical** to the
Apps Script `SHARED_SECRET`, or every relay returns `unauthorized`.

---

## 7. Confirm the frontend env

In `Frontend/.env`, ensure the API base points at the backend:

```dotenv
VITE_API_BASE_URL=http://localhost:5000      # or your deployed backend origin
```

No Apps Script URL lives in the frontend anymore — it's backend-only now.

---

## 8. Run and test end-to-end

**Start the backend:**

```bash
cd Backend && venv/bin/python run.py          # serves on http://localhost:5000
```

**Start the frontend (separate terminal):**

```bash
cd Frontend && npm run dev
```

**Walk the flow:**

1. Open the dashboard **as a guest / logged out** → the **Feedback** button is **not** shown. ✔
2. **Log in** as a real authorized user → the **Feedback** button appears.
3. Click **Feedback**. The modal says a code was emailed to your address → check your inbox
   for the 6-digit code.
4. Enter the code, solve the CAPTCHA (e.g. `7 + 4 → 11`), click **Verify**.
5. Type feedback, optionally attach a **PNG/JPG** (≤ 5 MB), click **Submit Feedback**.
6. Open the Google Sheet → a new row appears (with a Drive screenshot link if attached).

**Negative checks (optional but recommended):**

- Wrong OTP or CAPTCHA → rejected; after 5 tries the code is dead → request a new one.
- Reuse the same code twice → second attempt rejected (single-use).
- Rename a `.gif` to `.png` and attach it → rejected server-side ("Only JPG and PNG…").
- `curl -X POST <FEEDBACK_SCRIPT_URL> -d '{}'` (no secret) → `{"result":"error","error":"unauthorized"}`.

---

## 9. Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Opening the `/exec` URL in a browser shows **"Script function not found: doGet"** | **Normal, not a bug.** A browser sends a GET; the script only handles POST (used by the backend). Ignore it, or add the optional `doGet` (see the guideline) for a friendlier message. Verify the deployment with a `curl -X POST` instead. |
| "Could not send the verification email" (502) | `SMTP_*` missing/incorrect, or 2-Step/App Password not set up. Check backend logs for the SMTP error. |
| OTP email never arrives | Check spam; confirm `SMTP_USER` mailbox can send; Gmail daily cap reached; corporate firewall blocking port 587. |
| Submit succeeds but no row in Sheet | `FEEDBACK_SHARED_SECRET` ≠ Apps Script `SHARED_SECRET`; or the web app wasn't re-deployed after editing `doPost`. |
| "Feedback relay is not configured" (500) | `FEEDBACK_SCRIPT_URL` or `FEEDBACK_SHARED_SECRET` empty in `.env`. |
| Image always rejected | Must be a static JPEG/PNG ≤ 5 MB and ≤ 4000 px/side; animated PNG/GIF/WebP/stickers are refused by design. |
| 401 on `/api/feedback/*` | No/expired login token — the user must be logged in (guests are blocked server-side too). |
| "Please wait a minute…" (429) | Resend cooldown (1/min) or hourly cap (5/hour) per user. Expected. |

---

## 10. Production deployment checklist

- [ ] `pip install -r requirements.txt` on the production backend (Pillow present).
- [ ] Run `add_feedback_verification.sql` against the **production** database.
- [ ] Set `SMTP_*`, `FEEDBACK_SCRIPT_URL`, `FEEDBACK_SHARED_SECRET` in the production `.env`.
- [ ] Apps Script deployed with the matching secret; "Who has access" = Anyone.
- [ ] `VITE_API_BASE_URL` in the frontend build points at the production backend origin.
- [ ] Rebuild the frontend (`npm run build`) and redeploy.
- [ ] Smoke test: guest sees no button; a real login completes OTP → CAPTCHA → submit → row in Sheet.

---

## 11. Where things live (reference)

| Concern | File |
| --- | --- |
| Frontend modal (2-step verify → feedback) | `Frontend/src/components/FeedbackModal.jsx` |
| Hide button from guests | `Frontend/src/components/Header.jsx` |
| Endpoints `/start` `/verify` `/submit` + relay | `Backend/app/feedback.py` |
| SMTP OTP sender | `Backend/app/mailer.py` |
| Image validation + re-encode | `Backend/app/image_safety.py` |
| OTP/CAPTCHA state table | `Database_Schema/migrations/add_feedback_verification.sql` |
| Env template | `Backend/.env.example` |
| Apps Script / Sheet specifics | `docs/FEEDBACK_FORM_GUIDELINE.md` |
