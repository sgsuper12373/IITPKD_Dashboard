  # Feedback Form Integration & Google Sheets Setup Guide

This guide explains how the Feedback Form in the IITPKD Dashboard connects to a Google Sheet.

> **Important — the flow changed.** After launch the public form was abused (phishing
> images, stickers/GIFs, nude images) because the browser posted **directly** to the
> public Apps Script URL, so there was no server to verify the submitter or inspect the
> image. The form is now open to **everyone (including guests)** but every submission is
> routed through the Flask backend, which verifies an **email OTP + math CAPTCHA** (guests
> enter their own email; logged-in users use their account email) and **sanitises the
> screenshot** before relaying to the Sheet:
>
> ```
> Browser (any visitor) ──► Flask /api/feedback ──► Google Apps Script ──► Sheet/Drive
>                                       ▲
>                       OTP email + CAPTCHA + image validation enforced here
> ```
>
> The Apps Script URL is no longer in the frontend. It lives in the backend `.env`
> (`FEEDBACK_SCRIPT_URL`) and the Apps Script only accepts requests carrying a
> shared secret (`FEEDBACK_SHARED_SECRET`) — so a direct `curl` to the public URL,
> the original abuse vector, now fails.

---

## 📍 File / config locations

| What | Where |
| --- | --- |
| Frontend modal (two-step verify → feedback) | `Frontend/src/components/FeedbackModal.jsx` |
| Backend relay + OTP/CAPTCHA/image checks | `Backend/app/feedback.py`, `mailer.py`, `image_safety.py` |
| Apps Script URL + shared secret | `Backend/.env` → `FEEDBACK_SCRIPT_URL`, `FEEDBACK_SHARED_SECRET` |
| SMTP credentials for the OTP email | `Backend/.env` → `SMTP_HOST/PORT/USER/PASSWORD` |
| OTP/CAPTCHA state table | `Database_Schema/migrations/add_feedback_verification.sql` |

All required env vars are documented in **`Backend/.env.example`**.

---

## 🛠️ Step-by-Step Setup

### Step 1: Create a Google Sheet
1. Open [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.
2. Name it something descriptive (e.g., `IITPKD Dashboard Feedback Responses`).

### Step 2: Open the Apps Script editor
1. In the Sheet, go to **Extensions** > **Apps Script**.
2. Rename the project to something like `IITPKD Feedback Handler`.

### Step 3: Paste the Apps Script code (with the shared-secret guard)
Erase the default `Code.gs` and paste the following. **Set `SHARED_SECRET` to the same
value you put in `FEEDBACK_SHARED_SECRET` in `Backend/.env`.**

```javascript
// Must match FEEDBACK_SHARED_SECRET in Backend/.env. Known only to the Flask
// server, so direct POSTs to this public URL (without the secret) are rejected.
var SHARED_SECRET = "PASTE_THE_SAME_SECRET_AS_BACKEND_ENV";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // Reject anything that didn't come from our backend.
    if (!data.secret || data.secret !== SHARED_SECRET) {
      return ContentService
        .createTextOutput(JSON.stringify({ result: "error", error: "unauthorized" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getActiveSheet();

    // Initialize headers if the spreadsheet is completely empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Name", "Email", "Feedback", "Screenshot"]);
    }

    // If a (already-validated, re-encoded) screenshot was relayed, store it in Drive
    var screenshotUrl = "";
    if (data.screenshot) {
      var folderName = "IITPKD Dashboard Feedback Screenshots";
      var folders = DriveApp.getFoldersByName(folderName);
      var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

      var contentType = data.screenshotType || "image/png";
      var fileName = data.screenshotName || ("feedback_" + new Date().getTime() + ".png");
      var blob = Utilities.newBlob(Utilities.base64Decode(data.screenshot), contentType, fileName);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      screenshotUrl = file.getUrl();
    }

    sheet.appendRow([
      new Date(),
      data.name || "Anonymous",
      data.email,
      data.feedback,
      screenshotUrl
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log("Error inserting feedback: " + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Optional: lets you sanity-check the deployment in a browser. Opening the /exec
// URL is a GET request; without this you'll see "Script function not found: doGet"
// (harmless — the backend only ever talks to this script via POST).
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ result: "ok", message: "Feedback endpoint is live. Use POST." }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Save (`Ctrl/Cmd + S`). **After any script edit you must re-deploy a new version**
(Deploy → Manage deployments → ✏️ → *New version* → Deploy) for the change to take effect.

### Step 4: Deploy as a Web App
1. **Deploy** > **New deployment** > select type **Web app**.
2. **Description**: `IITPKD Dashboard Feedback API`.
3. **Execute as**: **Me**.
4. **Who has access**: **Anyone**. *(Required so the Flask server can reach it without a
   Google login. This is safe now because the `SHARED_SECRET` check — not Google auth —
   is what gates writes.)*
5. **Deploy**, authorize access (accept the Drive permission), and copy the **Web app URL**
   (`https://script.google.com/macros/s/XXXXX/exec`).

### Step 5: Configure the backend (NOT the frontend)
In `Backend/.env` (see `Backend/.env.example`):

```
FEEDBACK_SCRIPT_URL=https://script.google.com/macros/s/XXXXX/exec
FEEDBACK_SHARED_SECRET=<the exact string you set as SHARED_SECRET in the Apps Script>

# OTP email (Gmail App Password works for low volume; swap to institute SMTP later)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<sending gmail address>
SMTP_PASSWORD=<16-char Gmail App Password>
```

> **Gmail App Password:** enable 2-Step Verification on the account, then create an App
> Password at <https://myaccount.google.com/apppasswords>. Use that 16-char value as
> `SMTP_PASSWORD` — the normal account password will not work.

### Step 6: Apply the DB migration
```bash
psql -h <host> -U <user> -d <db> -f Database_Schema/migrations/add_feedback_verification.sql
```
And install the new image dependency:
```bash
cd Backend && pip install -r requirements.txt   # adds Pillow
```

---

## 🧪 Testing the Integration
1. Start the backend and frontend.
2. Open the dashboard **as a guest** — the Feedback button is visible to everyone.
3. Click **Feedback**, enter your **email**, and click **Send code**. (Logged-in users
   skip this step and the code goes to their account email.) Check your inbox.
4. Enter the code, solve the CAPTCHA (e.g. `7 + 4`), click **Verify**.
5. Enter feedback, optionally attach a **PNG/JPG**, and submit.
6. Confirm a new row (and a Drive screenshot link, if attached) appears in the Sheet.

### Re-deploying the script later
If you edit `doPost`, push a new version to the **same** deployment (Deploy → Manage
deployments → ✏️ → New version) so `FEEDBACK_SCRIPT_URL` stays the same.

---

## 🔒 Security model (why this stops the abuse)

- **Verified email per submission:** the form is open to everyone, but every submission
  is tied to an email proven via OTP (logged-in users use their account email; guests
  type their own). Abuse is traceable to a real, reachable inbox.
- **Email OTP + CAPTCHA:** a 6-digit code is emailed to that address and a math CAPTCHA
  must be solved; both are verified server-side, single-use, expire in 10 min, and are
  rate-limited per email (1/min, 5/hour) plus a per-IP cap on `/start` to curb mail
  bombing.
- **Image hardening (`image_safety.py`):** the screenshot's real type is detected by
  decoding (not the filename/MIME), only static **JPEG/PNG** are accepted, animated
  images/stickers are rejected, size + dimensions are capped, and the image is
  **re-encoded** so EXIF and any appended/polyglot payload is stripped before it ever
  reaches Drive.
- **Shared secret:** the Apps Script ignores any request without the backend-only
  secret, so the original `curl`-the-public-URL attack no longer works.

### Notes specific to screenshots
- **Drive storage**: every screenshot consumes Drive quota of the account that owns the
  script. Periodically clean the *IITPKD Dashboard Feedback Screenshots* folder if volume is high.
- **Privacy**: screenshots are set to *Anyone with the link can view* — fine for dashboard
  screenshots; don't encourage attaching sensitive content.
