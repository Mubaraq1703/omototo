
const express = require('express');
const bcrypt = require('bcryptjs');
const { google } = require('googleapis');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const xss = require('xss');

const router = express.Router();

// --- Google Sheets API Initialization ---
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID_APP;
const USERS_SHEET = 'users';
const SESSIONS_SHEET = 'session';

// --- Session Management ---

/**
 * Creates a new session in the Google Sheet.
 * @param {string} userId - The ID of the user.
 * @param {object} userDetails - An object containing user details to store in the session.
 * @param {object} req - The Express request object.
 * @returns {string} The session ID.
 */
async function createSession(userId, userDetails, req) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'];
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24-hour session

  const newSession = [
    sessionId,
    userId,
    ipAddress,
    userAgent,
    JSON.stringify(userDetails),
    createdAt,
    createdAt, // last_accessed_at
    expiresAt,
    'true', // is_active
    '', // location (can be added later)
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SESSIONS_SHEET}!A:J`,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [newSession],
    },
  });

  return sessionId;
}

/**
 * Ends a session by marking it as inactive in the Google Sheet.
 * @param {string} sessionId - The ID of the session to end.
 */
async function endSession(sessionId) {
  // 1. Get spreadsheet metadata to find the sheetId for 'session' sheet
  const spreadsheetMetadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties', // Request only sheet properties
  });

  const sessionSheet = spreadsheetMetadata.data.sheets.find(
    (s) => s.properties.title === SESSIONS_SHEET
  );

  if (!sessionSheet) {
    console.error(`Sheet titled '${SESSIONS_SHEET}' not found.`);
    return;
  }
  const sessionSheetId = sessionSheet.properties.sheetId;

  // 2. Get all session data to find the row index
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SESSIONS_SHEET}!A:A`, // Only need column A to find sessionId
  });

  const rows = response.data.values || [];
  // Find the 0-based index of the row containing the sessionId
  // Note: Google Sheets API row indices are 1-based for display, 0-based for API
  // The header row is at index 0. Data starts at index 1.
  const rowIndexToDelete = rows.findIndex((row) => row[0] === sessionId);

  // If found and it's not the header row
  if (rowIndexToDelete > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sessionSheetId,
                dimension: 'ROWS',
                startIndex: rowIndexToDelete, // 0-based index
                endIndex: rowIndexToDelete + 1, // Delete 1 row
              },
            },
          },
        ],
      },
    });
    console.log(`Session ${sessionId} physically deleted from Google Sheet.`);
  } else {
    console.log(`Session ${sessionId} not found for deletion.`);
  }
}

// --- Routes ---

// Login route
router.post('/login', [
  body('username').trim().escape(),
  body('password'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Invalid input.' });
  }

  const { username, password } = req.body;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USERS_SHEET}!A:I`,
    });

    const users = response.data.values || [];
    const userRow = users.find(row => row[7] === username);

    if (!userRow) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const hashedPassword = userRow[8];
    const isMatch = await bcrypt.compare(password, hashedPassword);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const user = {
      id: userRow[0],
      surname: userRow[1],
      first_name: userRow[2],
      role: userRow[6],
    };

    const sessionId = await createSession(user.id, user, req);

    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.json({ success: true, user });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// Logout route
router.post('/logout', async (req, res) => {
  const { session_id } = req.cookies;
  if (session_id) {
    await endSession(session_id);
  }
  res.clearCookie('session_id');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Session check route
router.get('/session', (req, res) => {
  if (req.user) {
    res.json({ success: true, user: req.user });
  } else {
    res.status(401).json({ success: false, error: 'Not authenticated.' });
  }
});

module.exports = router;

