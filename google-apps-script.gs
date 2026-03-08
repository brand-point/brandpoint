/*
  Google Apps Script (server-side) to append posted location data to a spreadsheet.

  Steps:
  1. Create a Google Spreadsheet.
  2. In the spreadsheet: Extensions → Apps Script.
  3. Replace SHEET_ID with your spreadsheet ID below.
  4. Save and Deploy → New deployment → Web app.
     - Execute as: Me
     - Who has access: Anyone (or Anyone, even anonymous)
  5. Copy the Web App URL and paste it into `assets/js/location-to-sheets.js` as SCRIPT_URL.
*/

const SHEET_ID = '1BTHai9jhWIfMtikvd_DmE3dOGhAnHQdRustid3ekofQ';

function doPost(e){
  try{
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    // Ensure headers exist on first write
    ensureHeaders(sheet);
    const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const now = new Date();
    sheet.appendRow([
      now.toISOString(),
      body.lat || '',
      body.lon || '',
      body.accuracy || '',
      body.timestamp || '',
      body.userAgent || ''
    ]);
    return ContentService.createTextOutput(JSON.stringify({status:'ok'})).setMimeType(ContentService.MimeType.JSON);
  }catch(err){
    return ContentService.createTextOutput(JSON.stringify({status:'error', message: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Ensure the sheet has header row. If the sheet is empty or first row is blank, write headers.
 */
function ensureHeaders(sheet){
  try{
    const lastRow = sheet.getLastRow();
    const headerRow = 1;
    const headers = ['server_timestamp','lat','lon','accuracy','client_timestamp','userAgent'];
    if (lastRow < 1) {
      sheet.getRange(headerRow,1,1,headers.length).setValues([headers]);
      return;
    }
    // Check if first row is empty (all empty cells)
    const firstRowValues = sheet.getRange(headerRow,1,1,headers.length).getValues()[0];
    const isEmpty = firstRowValues.every(function(v){ return v === '' || v === null; });
    if (isEmpty) sheet.getRange(headerRow,1,1,headers.length).setValues([headers]);
  }catch(e){
    // ignore header failures to avoid breaking writes
    Logger.log('ensureHeaders error: ' + e.message);
  }
}

// Handle GET requests: if query params include location data, append to sheet.
function doGet(e) {
  try {
    const params = e.parameter || {};
    if (params.lat) {
      const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
      // Ensure headers exist on first write
      ensureHeaders(sheet);
      const now = new Date();
      sheet.appendRow([
        now.toISOString(),
        params.lat || '',
        params.lon || '',
        params.accuracy || '',
        params.timestamp || '',
        params.userAgent ? decodeURIComponent(params.userAgent) : ''
      ]);
      const payload = { status: 'ok' };
      // JSONP support if callback param provided
      if (params.callback) {
        const cb = params.callback.replace(/[^A-Za-z0-9_\.]/g, '');
        return ContentService.createTextOutput(cb + '(' + JSON.stringify(payload) + ');')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
    }
    const readyPayload = { status: 'ready' };
    if (params.callback) {
      const cb2 = params.callback.replace(/[^A-Za-z0-9_\.]/g, '');
      return ContentService.createTextOutput(cb2 + '(' + JSON.stringify(readyPayload) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(JSON.stringify(readyPayload)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
