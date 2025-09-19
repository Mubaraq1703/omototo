const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const { google } = require('googleapis');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const xss = require('xss');

const router = express.Router();

// Import logs module
const { addLogEntry } = require('./logs');

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
  const expiresAt = new Date(Date.now() + 15 * 60 * 60 * 1000).toISOString(); // 15-hour session

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
 * Ends a session by physically deleting its row from the Google Sheet.
 * @param {string} sessionId - The ID of the session to end.
 */
async function endSession(sessionId) {
  console.log(`[endSession] Attempting to end session: ${sessionId}`);
  try {
    // 1. Get spreadsheet metadata to find the sheetId for 'session' sheet
    const spreadsheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: 'sheets.properties', // Request only sheet properties
    });

    const sessionSheet = spreadsheetMetadata.data.sheets.find(
      (s) => s.properties.title === SESSIONS_SHEET
    );

    if (!sessionSheet) {
      console.error(`[endSession] Sheet titled '${SESSIONS_SHEET}' not found.`);
      return;
    }
    const sessionSheetId = sessionSheet.properties.sheetId;
    console.log(`[endSession] Session Sheet ID: ${sessionSheetId}`);

    // 2. Get all session data to find the row index
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SESSIONS_SHEET}!A:A`, // Only need column A to find sessionId
    });

    const rows = response.data.values || [];
    console.log(`[endSession] Total rows in session sheet: ${rows.length}`);
    console.log(`[endSession] Looking for sessionId: ${sessionId}`);
    
    // Find the 0-based index of the row containing the sessionId
    // Note: Google Sheets API row indices are 1-based for display, 0-based for API
    // The header row is at index 0. Data starts at index 1.
    const rowIndexToDelete = rows.findIndex((row) => row[0] === sessionId);
    console.log(`[endSession] Found session at 0-based index: ${rowIndexToDelete}`);
    
    if (rowIndexToDelete > 0) {
      console.log(`[endSession] Session found at row ${rowIndexToDelete + 1} (1-based). Row data:`, rows[rowIndexToDelete]);
    }

    // If found and it's not the header row
    if (rowIndexToDelete > 0) {
      const deleteResponse = await sheets.spreadsheets.batchUpdate({
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
      console.log(`[endSession] Session ${sessionId} physically deleted from Google Sheet. API Response:`, deleteResponse.status);
    } else if (rowIndexToDelete === 0) {
      console.warn(`[endSession] Attempted to delete header row (index 0) for session ${sessionId}. Aborting.`);
    } else {
      console.log(`[endSession] Session ${sessionId} not found for deletion.`);
    }
  } catch (error) {
    console.error(`[endSession] Error during session deletion for ${sessionId}:`, error.message, error.stack);
  }
}

// --- Routes ---

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many login attempts from this IP, please try again after 15 minutes'
});

// Login route
router.post('/login', loginLimiter, [
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
      // Log failed login attempt
      await addLogEntry('Failed Login', `Failed login attempt for username: ${username}`, null);
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const hashedPassword = userRow[8];
    const isMatch = await bcrypt.compare(password, hashedPassword);

    if (!isMatch) {
      // Log failed login attempt
      await addLogEntry('Failed Login', `Failed login attempt for username: ${username}`, null);
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const user = {
      id: userRow[0],
      surname: userRow[1],
      first_name: userRow[2],
      role: userRow[6],
    };

    const sessionId = await createSession(user.id, user, req);
    
    // Log successful login
    await addLogEntry('User Login', `User ${username} logged in successfully`, user);

    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 60 * 1000, // 15 hours
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
  console.log(`[LOGOUT] Logout requested for session: ${session_id}`);
  
  if (session_id) {
    console.log(`[LOGOUT] Attempting to end session: ${session_id}`);
    await endSession(session_id);
    console.log(`[LOGOUT] Session deletion completed for: ${session_id}`);
    
    // Log logout event
    if (req.user) {
      await addLogEntry('User Logout', `User ${req.user.username} logged out`, req.user);
    }
  } else {
    console.log('[LOGOUT] No session ID found in logout request');
  }
  
  res.clearCookie('session_id');
  console.log('[LOGOUT] Cookie cleared, sending success response');
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

// Change password route
router.post('/change-password', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    try {
        const usersResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${USERS_SHEET}!A:I`,
        });

        const users = usersResponse.data.values || [];
        const userRowIndex = users.findIndex(row => row[0] === userId);

        if (userRowIndex === -1) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const userRow = users[userRowIndex];
        const hashedPassword = userRow[8];

        const isMatch = await bcrypt.compare(currentPassword, hashedPassword);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect current password.' });
        }

        const newHashedPassword = await bcrypt.hash(newPassword, 10);

        const rangeToUpdate = `${USERS_SHEET}!I${userRowIndex + 1}`;

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: rangeToUpdate,
            valueInputOption: 'RAW',
            resource: {
                values: [[newHashedPassword]],
            },
        });

        // Log password change
        await addLogEntry('Password Change', `User ${req.user.username} changed their password`, req.user);

        res.json({ success: true, message: 'Password updated successfully.' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

module.exports = router;