Quick setup
1) Create a Google Spreadsheet. Copy its ID (from the URL).
2) Open Extensions → Apps Script and paste the contents of `google-apps-script.gs`.
   - Set `SHEET_ID` to your spreadsheet ID.
3) Deploy the script as a Web App (Execute as: Me, access: Anyone).
4) Copy the Web App URL and set `SCRIPT_URL` in `assets/js/location-to-sheets.js`.
5) Open `location-to-sheets.html` in a browser (serve via HTTPS for geolocation in many browsers).

Notes
- Geolocation requires user permission. For best results, serve the HTML over HTTPS.
- If you choose to restrict the Apps Script, adjust CORS and access accordingly.
