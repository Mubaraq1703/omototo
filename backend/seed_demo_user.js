const { google } = require('googleapis');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// This script adds a demo user to your Google Sheet.
// Usage: node seed_demo_user.js <username> <password>

async function addDemoUser(username, password) {
  if (!username || !password) {
    console.error('Usage: node seed_demo_user.js <username> <password>');
    process.exit(1);
  }

  console.log(`Starting to add user '${username}'...`);

  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID_APP;

  try {
    // 1. Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('Password has been securely hashed.');

    // 2. Get the next user_id
    let nextUserId = 'user1';
    const userIdsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'users!A2:A',
    });

    const userIds = userIdsResponse.data.values || [];
    if (userIds.length > 0) {
      const lastUserId = userIds[userIds.length - 1][0];
      if (lastUserId && lastUserId.startsWith('user')) {
        const lastIdNum = parseInt(lastUserId.replace('user', ''));
        nextUserId = `user${lastIdNum + 1}`;
      }
    }
    console.log(`Next user ID will be: ${nextUserId}`);

    // 3. Prepare the new user data
    const newUser = [
      nextUserId,
      'Demo', // surname
      'User', // first_name
      '', // other_name
      '123 Demo Street', // address
      '555-0101', // phone
      'admin', // role
      username,
      hashedPassword,
      new Date().toISOString(),
      'system-seed' // createdBy
    ];

    // 4. Append the new user to the Google Sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'users!A:K',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [newUser]
      }
    });

    console.log(`\n✅ Successfully added user '${username}' to the sheet.`);
    console.log('You can now log in with these credentials.');

  } catch (error) {
    console.error('\n❌ Error adding demo user:', error);
  }
}

// Get username and password from command line arguments
const [,, username, password] = process.argv;

addDemoUser(username, password);
