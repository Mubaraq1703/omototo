const express = require('express');
const bcrypt = require('bcryptjs');
const { google } = require('googleapis');
const { body, validationResult } = require('express-validator');
const xss = require('xss');
const router = express.Router();

// Initialize Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Input validation and sanitization rules
const registrationValidationRules = [
  body('username')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
    .isAlphanumeric().withMessage('Username must be alphanumeric')
    .trim()
    .escape(),
  body('first_name')
    .isLength({ min: 1 }).withMessage('First name is required')
    .isAlpha('en-US', { ignore: ' -' }).withMessage('First name must contain only letters')
    .trim()
    .escape(),
  body('surname')
    .isLength({ min: 1 }).withMessage('Surname is required')
    .isAlpha('en-US', { ignore: ' -' }).withMessage('Surname must contain only letters')
    .trim()
    .escape(),
  body('other_name')
    .optional()
    .isAlpha('en-US', { ignore: ' -' }).withMessage('Other name must contain only letters')
    .trim()
    .escape(),
  body('phone')
    .isMobilePhone().withMessage('Please provide a valid phone number')
    .trim()
    .escape(),
  body('address')
    .isLength({ min: 5 }).withMessage('Address must be at least 5 characters')
    .trim()
    .escape(),
  body('role')
    .isIn(['admin', 'manager', 'supervisor', 'operator', 'clerk']).withMessage('Please select a valid role'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character')
];

// Check username availability endpoint
router.post('/check-username', [
  body('username')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
    .isAlphanumeric().withMessage('Username must be alphanumeric')
    .trim()
    .escape()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: errors.array()
      });
    }

    const { username } = req.body;
    
    // For now, just return that the username is available
    // In a real implementation, you would check against your database
    res.json({
      success: true,
      available: true
    });
    
  } catch (error) {
    console.error('Username check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking username availability'
    });
  }
});

// Registration endpoint
router.post('/register', registrationValidationRules, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      username,
      first_name,
      surname,
      other_name,
      phone,
      address,
      role,
      password
    } = req.body;

    // Additional XSS sanitization
    const sanitizedData = {
      username: xss(username),
      first_name: xss(first_name),
      surname: xss(surname),
      other_name: xss(other_name || ''),
      phone: xss(phone),
      address: xss(address),
      role: xss(role)
    };

    // Hash password with bcrypt
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Get the next user_id
    let nextUserId = 'user1';
    try {
      const userIdsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID_APP,
        range: 'users!A2:A',
      });

      const userIds = userIdsResponse.data.values || [];
      if (userIds.length > 0) {
        const lastUserId = userIds[userIds.length - 1][0];
        const lastIdNum = parseInt(lastUserId.replace('user', ''));
        nextUserId = `user${lastIdNum + 1}`;
      }
    } catch (error) {
      console.error('Error getting next user ID:', error);
      // Continue with default user1 if there's an error
    }

    // Get the currently logged-in user (placeholder - replace with actual auth)
    const createdBy = 'system'; // In a real app, get from session/JWT

    // Prepare the new user data
    const newUser = [
      nextUserId,
      sanitizedData.surname,
      sanitizedData.first_name,
      sanitizedData.other_name,
      sanitizedData.address,
      sanitizedData.phone,
      sanitizedData.role,
      sanitizedData.username,
      hashedPassword,
      new Date().toISOString(),
      createdBy
    ];

    // Append the new user to the Google Sheet
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID_APP,
        range: 'users!A:K',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [newUser]
        }
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful'
      });
    } catch (error) {
      console.error('Google Sheets API error:', error);
      res.status(500).json({
        success: false,
        message: 'Error saving user data'
      });
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
});

module.exports = router;