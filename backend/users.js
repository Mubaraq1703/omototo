require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const { google } = require('googleapis');

const router = express.Router();

// --- Google Sheets API Initialization ---
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID_APP;
const USER_SHEET = 'users';

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

// Middleware to check for admin role
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'manager') {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: Managers only'
        });
    }
    next();
};

// Get all users
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${USER_SHEET}!A:K`,
        });

        const rows = response.data.values || [];
        if (rows.length <= 1) {
            return res.json({
                success: true,
                data: []
            });
        }

        const headers = rows[0];
        const users = rows.slice(1).map(row => {
            const user = {};
            headers.forEach((header, index) => {
                user[header] = row[index];
            });
            return user;
        });

        res.json({
            success: true,
            data: users
        });

    } catch (error) {
        console.error('[GET /api/users] Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
});

// Add a new user
router.post('/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const {
            surname,
            first_name,
            other_name,
            address,
            phone,
            role,
            username,
            password
        } = req.body;

        if (!surname || !first_name || !role || !username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Surname, first name, role, username, and password are required'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user_id = `USER${Date.now()}`;
        const created_at = new Date().toISOString();
        const created_by = `${req.user.first_name} ${req.user.surname}`;

        const rowData = [
            user_id,
            surname,
            first_name,
            other_name || '',
            address || '',
            phone || '',
            role,
            username,
            hashedPassword,
            created_at,
            created_by
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${USER_SHEET}!A:K`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [rowData]
            }
        });

        res.json({
            success: true,
            message: 'User created successfully',
            data: { user_id }
        });

    } catch (error) {
        console.error('[POST /api/users] Error creating user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user'
        });
    }
});

// Delete a user
router.delete('/users/:userId', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${USER_SHEET}!A:A`, // Only need the user_id column
        });

        const rows = response.data.values || [];
        if (rows.length <= 1) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userIndex = rows.slice(1).findIndex(row => row[0] === userId);

        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const rowIndex = userIndex + 2; // +1 for header, +1 for 1-based index

        // Get the sheetId
        const sheetMetadata = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });
        const sheet = sheetMetadata.data.sheets.find(s => s.properties.title === USER_SHEET);
        if (!sheet) {
            return res.status(500).json({
                success: false,
                message: 'Could not find sheet to delete from'
            });
        }
        const sheetId = sheet.properties.sheetId;

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex - 1,
                            endIndex: rowIndex
                        }
                    }
                }]
            }
        });

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('[DELETE /api/users/:userId] Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
});

module.exports = router;
