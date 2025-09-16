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
const PAYMENT_SHEET = 'in_payment'; // Sheet name for payment records

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

// Helper function to calculate payment status
const calculatePaymentStatus = (amount, payMade) => {
  if (payMade === 0) return 'unpaid';
  if (payMade < amount) return 'partial';
  if (payMade === amount) return 'paid';
  if (payMade > amount) return 'over-paid';
  return 'unpaid'; // fallback
};

// Helper function to fetch payment records
const fetchPaymentRecords = async () => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PAYMENT_SHEET}!A:E`, // A to E for payment sheet columns
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return {}; // No data or only headers

    // Group payments by in_id and sum amount_paid
    const paymentSummary = {};
    rows.slice(1).forEach(row => {
      const [in_payment_id, in_id, amount_paid, created_at, created_by] = row;
      
      if (in_id && amount_paid) {
        const paid = parseFloat(amount_paid) || 0;
        paymentSummary[in_id] = (paymentSummary[in_id] || 0) + paid;
      }
    });

    return paymentSummary;
  } catch (error) {
    console.error('[fetchPaymentRecords] Error:', error);
    return {};
  }
};

// Get all goods in data
router.get('/goods-in', requireAuth, async (req, res) => {
  try {
    console.log(`[GET /goods-in] Request from user: ${req.user.username}`);
    
    // Fetch goods data
    const goodsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${GOODS_IN_SHEET}!A:K`, // A to K to include all columns
    });

    const goodsRows = goodsResponse.data.values || [];
    
    if (goodsRows.length === 0) {
      console.log('[GET /goods-in] No data found in goods sheet');
      return res.json({ 
        success: true, 
        data: [] 
      });
    }

    // Fetch payment records and group by in_id
    console.log('[GET /goods-in] Fetching payment records...');
    const paymentSummary = await fetchPaymentRecords();
    console.log('[GET /goods-in] Payment summary:', paymentSummary);

    // Skip header row and format data with calculated status
    const goodsData = goodsRows.slice(1).map(row => {
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

      const requiredAmount = parseFloat(amount) || 0;
      const payMade = paymentSummary[in_id] || 0;
      const status = calculatePaymentStatus(requiredAmount, payMade);

      return {
        in_id: in_id || '',
        name: name || '',
        weight: parseFloat(weight) || 0,
        price_per_kg: parseFloat(price_per_kg) || 0,
        amount: requiredAmount,
        acct_no: acct_no || '',
        bank: bank || '',
        phone_no: phone_no || '',
        pay_made: payMade,
        created_at: created_at || '',
        created_by: created_by || '',
        status: status
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
    
    // Calculate total amount based on weight and price per kg
    const total_amount = parseFloat(weight) * parseFloat(price_per_kg);
    const debt = 0; // Debt field kept for compatibility but not used for status
    
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
        status: 'paid' // Status will be recalculated when fetched
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
    
    // Fetch goods data
    const goodsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${GOODS_IN_SHEET}!A:K`,
    });

    const goodsRows = goodsResponse.data.values || [];
    
    if (goodsRows.length <= 1) { // Only header or no data
      return res.json({
        success: true,
        data: {
          totalWeight: 0,
          amountPaid: 0,
          amountDue: 0,
          totalAmount: 0
        }
      });
    }

    // Fetch payment records
    const paymentSummary = await fetchPaymentRecords();

    // Calculate summary from data using new payment logic
    let totalWeight = 0;
    let totalAmountRequired = 0;
    let totalAmountPaid = 0;

    goodsRows.slice(1).forEach(row => {
      const in_id = row[0];
      const weight = parseFloat(row[2]) || 0;
      const amount = parseFloat(row[4]) || 0;
      const payMade = paymentSummary[in_id] || 0;

      totalWeight += weight;
      totalAmountRequired += amount;
      totalAmountPaid += payMade;
    });

    const amountDue = totalAmountRequired - totalAmountPaid;

    console.log(`[GET /dashboard-summary] Summary - Weight: ${totalWeight}, Required: ${totalAmountRequired}, Paid: ${totalAmountPaid}, Due: ${amountDue}`);

    res.json({
      success: true,
      data: {
        totalWeight: totalWeight,
        amountPaid: totalAmountPaid,
        amountDue: Math.max(0, amountDue), // Ensure non-negative
        totalAmount: totalAmountRequired
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

// Add payment record to in_payment sheet
router.post('/payment', requireAuth, async (req, res) => {
  try {
    const {
      in_id,
      amount_paid
    } = req.body;

    // Validate required fields
    if (!in_id || !amount_paid) {
      return res.status(400).json({
        success: false,
        message: 'in_id and amount_paid are required'
      });
    }

    // Validate amount_paid is positive
    if (parseFloat(amount_paid) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount paid must be greater than 0'
      });
    }

    // Generate unique payment ID
    const timestamp = Date.now();
    const in_payment_id = `PAY${timestamp}`;
    
    const created_at = new Date().toISOString();
    const created_by = req.user.username;

    // Prepare row data for payment sheet
    const paymentRowData = [
      in_payment_id,
      in_id,
      parseFloat(amount_paid),
      created_at,
      created_by
    ];

    console.log(`[POST /payment] Adding payment record by user: ${req.user.username}`);
    console.log('[POST /payment] Payment data:', paymentRowData);

    // Append to payment sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PAYMENT_SHEET}!A:E`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [paymentRowData]
      }
    });

    console.log(`[POST /payment] Successfully added payment record with ID: ${in_payment_id}`);

    res.json({
      success: true,
      message: 'Payment record added successfully',
      data: {
        in_payment_id,
        in_id,
        amount_paid: parseFloat(amount_paid),
        created_at,
        created_by
      }
    });

  } catch (error) {
    console.error('[POST /payment] Error adding payment record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add payment record'
    });
  }
});

// Get payment history for a specific in_id
router.get('/payments/:in_id', requireAuth, async (req, res) => {
  try {
    const { in_id } = req.params;
    
    console.log(`[GET /payments/${in_id}] Request from user: ${req.user.username}`);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PAYMENT_SHEET}!A:E`,
    });

    const rows = response.data.values || [];
    
    if (rows.length <= 1) {
      return res.json({ 
        success: true, 
        data: [] 
      });
    }

    // Filter payments for the specific in_id
    const payments = rows.slice(1)
      .filter(row => row[1] === in_id) // Filter by in_id column
      .map(row => {
        const [in_payment_id, payment_in_id, amount_paid, created_at, created_by] = row;
        
        return {
          in_payment_id: in_payment_id || '',
          in_id: payment_in_id || '',
          amount_paid: parseFloat(amount_paid) || 0,
          created_at: created_at || '',
          created_by: created_by || ''
        };
      });

    console.log(`[GET /payments/${in_id}] Returning ${payments.length} payment records`);
    
    res.json({ 
      success: true, 
      data: payments 
    });

  } catch (error) {
    console.error(`[GET /payments/${req.params.in_id}] Error:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch payment records' 
    });
  }
});

module.exports = router;