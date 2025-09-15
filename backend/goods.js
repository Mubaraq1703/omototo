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
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID_APP;
const GOODS_IN_SHEET = 'in'; // Sheet name for goods in data

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

// Get all goods in data
router.get('/goods-in', requireAuth, async (req, res) => {
  try {
    console.log(`[GET /goods-in] Request from user: ${req.user.username}`);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${GOODS_IN_SHEET}!A:K`, // A to K to include all columns
    });

    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      console.log('[GET /goods-in] No data found in sheet');
      return res.json({ 
        success: true, 
        data: [] 
      });
    }

    // Skip header row and format data
    const goodsData = rows.slice(1).map(row => {
      const [
        in_id, 
        name, 
        weight, 
        price_per_kg, 
        amount, 
        acct_no, 
        bank, 
        phone_no, 
        debt, 
        created_at, 
        created_by
      ] = row;

      return {
        in_id: in_id || '',
        name: name || '',
        weight: parseFloat(weight) || 0,
        price_per_kg: parseFloat(price_per_kg) || 0,
        amount: parseFloat(amount) || 0,
        acct_no: acct_no || '',
        bank: bank || '',
        phone_no: phone_no || '',
        debt: parseFloat(debt) || 0,
        created_at: created_at || '',
        created_by: created_by || '',
        // Calculate status based on debt
        status: (parseFloat(debt) || 0) <= 0 ? 'completed' : 'pending'
      };
    });

    console.log(`[GET /goods-in] Returning ${goodsData.length} records`);
    
    res.json({ 
      success: true, 
      data: goodsData 
    });

  } catch (error) {
    console.error('[GET /goods-in] Error fetching goods data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch goods data' 
    });
  }
});

// Add new goods in record
router.post('/goods-in', requireAuth, async (req, res) => {
  try {
    const {
      name,
      weight,
      acct_no,
      bank,
      phone_no,
      amount_paid
    } = req.body;

    // Validate required fields
    if (!name || !weight || !acct_no || !bank || !phone_no || !amount_paid) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Generate unique ID
    const timestamp = Date.now();
    const in_id = `IN${timestamp}`;
    
    // Calculate price per kg (assuming amount_paid is total amount)
    const price_per_kg = (parseFloat(amount_paid) / parseFloat(weight)).toFixed(2);
    
    // For now, assuming no debt (amount paid = total amount)
    const total_amount = parseFloat(amount_paid);
    const debt = 0; // No debt since amount is paid
    
    const created_at = new Date().toISOString();
    const created_by = req.user.username;

    // Prepare row data matching the sheet structure
    const rowData = [
      in_id,
      name,
      parseFloat(weight),
      parseFloat(price_per_kg),
      total_amount,
      acct_no,
      bank,
      phone_no,
      debt,
      created_at,
      created_by
    ];

    console.log(`[POST /goods-in] Adding new record by user: ${req.user.username}`);
    console.log('[POST /goods-in] Row data:', rowData);

    // Append to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${GOODS_IN_SHEET}!A:K`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData]
      }
    });

    console.log(`[POST /goods-in] Successfully added record with ID: ${in_id}`);

    res.json({
      success: true,
      message: 'Goods in record added successfully',
      data: {
        in_id,
        name,
        weight: parseFloat(weight),
        price_per_kg: parseFloat(price_per_kg),
        amount: total_amount,
        acct_no,
        bank,
        phone_no,
        debt,
        created_at,
        created_by,
        status: 'completed'
      }
    });

  } catch (error) {
    console.error('[POST /goods-in] Error adding goods record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add goods record'
    });
  }
});

// Get dashboard summary data
router.get('/dashboard-summary', requireAuth, async (req, res) => {
  try {
    console.log(`[GET /dashboard-summary] Request from user: ${req.user.username}`);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${GOODS_IN_SHEET}!A:K`,
    });

    const rows = response.data.values || [];
    
    if (rows.length <= 1) { // Only header or no data
      return res.json({
        success: true,
        data: {
          totalWeight: 0,
          amountPaid: 0,
          amountDue: 0,
          debt: 0
        }
      });
    }

    // Calculate summary from data
    let totalWeight = 0;
    let totalAmountPaid = 0;
    let totalDebt = 0;

    rows.slice(1).forEach(row => {
      const weight = parseFloat(row[2]) || 0;
      const amount = parseFloat(row[4]) || 0;
      const debt = parseFloat(row[8]) || 0;

      totalWeight += weight;
      totalAmountPaid += amount;
      totalDebt += debt;
    });

    const amountDue = totalDebt; // Amount due is the same as debt

    console.log(`[GET /dashboard-summary] Summary - Weight: ${totalWeight}, Paid: ${totalAmountPaid}, Due: ${amountDue}, Debt: ${totalDebt}`);

    res.json({
      success: true,
      data: {
        totalWeight: totalWeight,
        amountPaid: totalAmountPaid,
        amountDue: amountDue,
        debt: totalDebt
      }
    });

  } catch (error) {
    console.error('[GET /dashboard-summary] Error fetching summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard summary'
    });
  }
});

module.exports = router;