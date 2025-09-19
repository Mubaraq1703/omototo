require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');

const router = express.Router();

// --- Google Sheets API Initialization ---
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const LOGS_SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID_LOG;
const LOGS_SHEET = 'logs';

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }
  next();
};

// Helper function to add a log entry
async function addLogEntry(activity, details, user) {
  try {
    const log_id = `LOG${Date.now()}`;
    const created_at = new Date().toISOString();
    const created_by = user ? `${user.first_name} ${user.surname}` : 'System';
    
    const rowData = [
      log_id,
      activity,
      created_by,
      created_at,
      details
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: LOGS_SPREADSHEET_ID,
      range: `${LOGS_SHEET}!A:E`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData]
      }
    });

    console.log(`[LOGS] Added log entry: ${activity} by ${created_by}`);
  } catch (error) {
    console.error('[LOGS] Error adding log entry:', error);
  }
}

// Get all logs
router.get('/logs', requireAuth, async (req, res) => {
  try {
    console.log(`[GET /logs] Request from user: ${req.user.username}`);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: LOGS_SPREADSHEET_ID,
      range: `${LOGS_SHEET}!A:E`,
    });

    const rows = response.data.values || [];
    
    if (rows.length <= 1) { // Only header or no data
      return res.json({ 
        success: true, 
        data: [] 
      });
    }

    // Skip header row and format data
    const logsData = rows.slice(1).map(row => {
      const [log_id, activity, created_by, created_at, details] = row;
      
      return {
        log_id: log_id || '',
        activity: activity || '',
        created_by: created_by || '',
        created_at: created_at || '',
        details: details || ''
      };
    });

    // Sort by created_at (newest first)
    logsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log(`[GET /logs] Returning ${logsData.length} log entries`);
    
    res.json({ 
      success: true, 
      data: logsData 
    });

  } catch (error) {
    console.error('[GET /logs] Error fetching logs data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch logs data' 
    });
  }
});

// Export the addLogEntry function so it can be used in other modules
module.exports = {
  router,
  addLogEntry
};