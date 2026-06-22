# Feedback Form Integration & Google Sheets Setup Guide

This guide explains how to connect the Feedback Form in the IITPKD Dashboard to a Google Sheet. The feedback submission uses **Google Apps Script** as a lightweight backend proxy to receive submissions from the React client and append them directly to a spreadsheet.

---

## 📍 File Locations

1. **Frontend Component**: `Frontend/src/components/FeedbackModal.jsx`
2. **Variable to Update**: `SCRIPT_URL` (defined near the top of the file)

---

## 🛠️ Step-by-Step Setup

### Step 1: Create a Google Sheet
1. Open [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.
2. Give your spreadsheet a descriptive name (e.g., `IITPKD Dashboard Feedback Responses`).
3. (Optional) Rename the sheet tab at the bottom to `Feedback` or leave it as `Sheet1`.

### Step 2: Open Google Apps Script editor
1. In the Google Sheets top menu, go to **Extensions** > **Apps Script**.
2. This opens the Apps Script editor connected to your spreadsheet.
3. Rename the Apps Script project at the top to something like `IITPKD Feedback Handler`.

### Step 3: Paste the Apps Script Code
1. Erase any default code in the editor (`Code.gs`) and paste the following Google Apps Script:

```javascript
function doPost(e) {
  try {
    // Open the spreadsheet that owns this script
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getActiveSheet();
    
    // Parse the incoming JSON payload from the frontend request
    var data = JSON.parse(e.postData.contents);
    
    // Initialize headers if the spreadsheet is completely empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Name", "Email", "Feedback"]);
    }
    
    // Append a new row with timestamp and form values
    var timestamp = new Date();
    sheet.appendRow([
      timestamp, 
      data.name || "Anonymous", 
      data.email, 
      data.feedback
    ]);
    
    // Return a success JSON payload
    return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log("Error inserting feedback: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
```

2. Save the script (click the floppy disk icon or press `Ctrl + S` / `Cmd + S`).

### Step 4: Deploy the Script as a Web App
For the frontend React application to communicate with your Google Sheet, you must deploy the script as a public Web App.

1. In the upper-right corner of the Apps Script editor, click **Deploy** > **New deployment**.
2. Click the gear icon (**Select type**) next to "Configuration" and choose **Web app**.
3. Fill out the configuration fields:
   - **Description**: `IITPKD Dashboard Feedback Form API` (or similar).
   - **Execute as**: Select **Me (your-email@gmail.com)**.
   - **Who has access**: Select **Anyone**. *(This is critical to allow submissions from the web client without requiring users to log into a Google Account).*
4. Click **Deploy**.
5. You may be prompted to **Authorize Access**. Follow the instructions:
   - Click *Authorize Access*.
   - Choose your Google Account.
   - Click *Advanced* (on the Google Safety screen) and then click *Go to IITPKD Feedback Handler (unsafe)* to grant permissions.
6. Once deployed, copy the **Web app URL** provided in the confirmation window. The URL will look like:
   `https://script.google.com/macros/s/XXXXX...XXXXX/exec`

### Step 5: Update the URL in the React Project
1. Open the file `Frontend/src/components/FeedbackModal.jsx`.
2. Locate the `SCRIPT_URL` constant near the top:
   ```javascript
   const SCRIPT_URL = 'YOUR_NEW_GOOGLE_SCRIPT_URL_HERE';
   ```
3. Replace the existing placeholder URL with the Web App URL you copied in Step 4.
4. Save the file.

---

## 🧪 Testing the Integration
1. Run the frontend development server:
   ```bash
   cd Frontend
   npm run dev
   ```
2. Navigate to the dashboard in your browser and click on the **Feedback** action/button (usually in the header or footer).
3. Fill out the fields (Name, Email, and Feedback content) and submit.
4. Go back to your Google Sheet. You should see a new row populated with the timestamp, name, email, and feedback message instantly.

---

## 📸 Adding Screenshot Upload Support

The feedback form can also let users attach a screenshot. The image is sent (base64-encoded) inside the same JSON payload; the Apps Script decodes it, saves it to a Google Drive folder, makes it link-viewable, and writes the Drive link into a new **Screenshot** column of the sheet.

> The **frontend** part (file picker, preview, 5 MB validation, base64 conversion, payload field) is already implemented in `Frontend/src/components/FeedbackModal.jsx`. You only need to update the Apps Script and re-deploy.

### Step A: Replace the Apps Script with the screenshot-aware version
In the Apps Script editor, replace the `doPost` function with this:

```javascript
function doPost(e) {
  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getActiveSheet();

    // Parse the incoming JSON payload from the frontend request
    var data = JSON.parse(e.postData.contents);

    // Initialize headers if the spreadsheet is completely empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Name", "Email", "Feedback", "Screenshot"]);
    }

    // If a screenshot was attached, decode it and store it in Drive
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

    // Append the feedback row (with the Drive link, if any)
    sheet.appendRow([
      new Date(),
      data.name || "Anonymous",
      data.email,
      data.feedback,
      screenshotUrl
    ]);

    return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log("Error inserting feedback: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
```

### Step B: Re-deploy (keep the same URL)
Because the script now touches Google Drive, it needs a new authorization **and** a new version published to the *existing* deployment so your `SCRIPT_URL` does not change:

1. Save the script (`Ctrl/Cmd + S`).
2. Click **Deploy** > **Manage deployments**.
3. Click the ✏️ (pencil/edit) icon on your existing deployment.
4. Under **Version**, choose **New version**, then click **Deploy**.
5. When prompted, **Authorize Access** again and accept the new Drive permission (`See, edit, create, and delete … Google Drive files`).
6. The Web app URL stays the same — no frontend change needed.

> If you instead create a *brand-new* deployment, the URL changes; in that case update `SCRIPT_URL` in `FeedbackModal.jsx` (Step 5 above).

### Step C: Verify
1. Open the feedback form, attach an image (≤ 5 MB), and submit.
2. In the sheet, the new row should have a **Screenshot** link.
3. Open the link — it should show the uploaded image (stored in the *IITPKD Dashboard Feedback Screenshots* Drive folder).

### Notes specific to screenshots
- **Size**: the frontend rejects images larger than 5 MB. base64 inflates the payload by ~33%; keep images modest so requests stay fast and within Apps Script payload limits.
- **Drive storage**: every screenshot consumes Drive quota of the account that owns the script. Periodically clean the folder if volume is high.
- **Privacy**: screenshots are set to *Anyone with the link can view*. Anyone holding the Drive link can see the image — acceptable for dashboard screenshots, but don't encourage users to attach sensitive content.

---

## ⚠️ Notes & Security Considerations

- **CORS handling (`no-cors`)**: The `fetch` function in the frontend operates in `no-cors` mode to bypass strict cross-origin checks. Consequently, the browser cannot read the Google response body (it is treated as an "opaque" response). Even if the promise resolves successfully, the status is handled based on the HTTP request success. The provided Apps Script is specifically structured to process the `no-cors` request body.
- **Rate Limits**: Google Apps Script has daily quotas (e.g., 20,000 email/spreadsheet operations per day for consumer accounts, 100,000 for Google Workspace accounts). This is more than sufficient for typical dashboard feedback volume.
- **Privacy**: Because "Who has access" is set to "Anyone", anyone with the URL can submit POST requests. Ensure you do not store highly sensitive credentials inside the Apps Script environment itself.
