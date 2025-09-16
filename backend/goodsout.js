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
const GOODS_OUT_SHEET = 'out'; // Sheet name for goods out data
const OUT_PAYMENT_SHEET = 'out_payment'; // Sheet name for out payment records

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

// Helper function to fetch out payment records
const fetchOutPaymentRecords = async () => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${OUT_PAYMENT_SHEET}!A:E`, // A to E for payment sheet columns
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return {}; // No data or only headers

    // Group payments by out_id and sum amount_paid
    const paymentSummary = {};
    rows.slice(1).forEach(row => {
      const [out_payment_id, out_id, amount_paid, created_at, created_by] = row;
      
      if (out_id && amount_paid) {
        const paid = parseFloat(amount_paid) || 0;
        paymentSummary[out_id] = (paymentSummary[out_id] || 0) + paid;
      }
    });

    return paymentSummary;
  } catch (error) {
    console.error('[fetchOutPaymentRecords] Error:', error);
    return {};
  }
};

// Get all goods out data
router.get('/goods-out', requireAuth, async (req, res) => {
  try {
    console.log(`[GET /goods-out] Request from user: ${req.user.username}`);
    
    // Fetch goods out data - Updated to match simplified structure
    const goodsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${GOODS_OUT_SHEET}!A:J`, // A to J for 10 columns
    });

    const goodsRows = goodsResponse.data.values || [];
    
    if (goodsRows.length === 0) {
      console.log('[GET /goods-out] No data found in goods out sheet');
      return res.json({ 
        success: true, 
        data: [] 
      });
    }

    // Skip header row and format data - Updated to match simplified structure
    const goodsOutData = goodsRows.slice(1).map(row => {
      const [
        out_id,
        loader,
        company,
        weight,
        truck_no,
        driver_no,
        delivered_weight,
        weight_difference,
        created_at,
        created_by
      ] = row;

      return {
        out_id: out_id || '',
        loader: loader || '',
        company: company || '',
        weight: parseFloat(weight) || 0,
        truck_no: truck_no || '',
        driver_no: driver_no || '',
        delivered_weight: parseFloat(delivered_weight) || 0,
        weight_difference: parseFloat(weight_difference) || 0,
        created_at: created_at || '',
        created_by: created_by || ''
      };
    });

    console.log(`[GET /goods-out] Returning ${goodsOutData.length} records`);
    
    res.json({ 
      success: true, 
      data: goodsOutData 
    });

  } catch (error) {
    console.error('[GET /goods-out] Error fetching goods out data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch goods out data' 
    });
  }
});

// Add new goods out record
router.post('/goods-out', requireAuth, async (req, res) => {
  try {
    const {
      loader,
      company,
      weight,
      truck_no,
      driver_no,
      delivered_weight
    } = req.body;

    // Validate required fields
    if (!loader || !weight || !truck_no || !driver_no || !delivered_weight) {
      return res.status(400).json({
        success: false,
        message: 'Loader, weight, truck number, driver number, and delivered weight are required'
      });
    }

    // Calculate values based on actual sheet structure
    const actualWeight = parseFloat(weight) || 0;
    const actualDeliveredWeight = parseFloat(delivered_weight) || 0;
    const weight_difference = actualDeliveredWeight - actualWeight;
    
    // Generate unique ID
    const timestamp = Date.now();
    const out_id = `OUT${timestamp}`;
    
    const created_at = new Date().toISOString();
    
    // Use full name (first_name + surname) for created_by
    const created_by = `${req.user.first_name} ${req.user.surname}`;

    // Prepare row data for out sheet - Updated to match user's requirements
    const rowData = [
      out_id,
      loader,
      company || '',
      actualWeight,
      truck_no,
      driver_no,
      actualDeliveredWeight,
      weight_difference,
      created_at,
      created_by
    ];

    console.log(`[POST /goods-out] Adding new record by user: ${created_by}`);
    console.log('[POST /goods-out] Row data:', rowData);

    // Append to out sheet - Updated range for 10 columns (A-J)
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${GOODS_OUT_SHEET}!A:J`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData]
      }
    });

    console.log(`[POST /goods-out] Successfully added record with ID: ${out_id}`);

    res.json({
      success: true,
      message: 'Goods out record added successfully',
      data: {
        out_id,
        loader,
        company: company || '',
        weight: actualWeight,
        truck_no,
        driver_no,
        delivered_weight: actualDeliveredWeight,
        weight_difference,
        created_at,
        created_by
      }
    });

  } catch (error) {
    console.error('[POST /goods-out] Error adding goods out record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add goods out record: ' + error.message
    });
  }
});

// Add payment record to out_payment sheet
router.post('/goods-out-payment', requireAuth, async (req, res) => {
  try {
    const {
      out_id,
      amount_paid
    } = req.body;

    // Validate required fields
    if (!out_id || !amount_paid) {
      return res.status(400).json({
        success: false,
        message: 'out_id and amount_paid are required'
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
    const out_payment_id = `OUTPAY${timestamp}`;
    
    const created_at = new Date().toISOString();
    const created_by = `${req.user.first_name} ${req.user.surname}`;

    // Prepare row data for payment sheet
    const paymentRowData = [
      out_payment_id,
      out_id,
      parseFloat(amount_paid),
      created_at,
      created_by
    ];

    console.log(`[POST /goods-out-payment] Adding payment record by user: ${created_by}`);
    console.log('[POST /goods-out-payment] Payment data:', paymentRowData);

    // Append to payment sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${OUT_PAYMENT_SHEET}!A:E`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [paymentRowData]
      }
    });

    console.log(`[POST /goods-out-payment] Successfully added payment record with ID: ${out_payment_id}`);

    res.json({
      success: true,
      message: 'Payment record added successfully',
      data: {
        out_payment_id,
        out_id,
        amount_paid: parseFloat(amount_paid),
        created_at,
        created_by
      }
    });

  } catch (error) {
    console.error('[POST /goods-out-payment] Error adding payment record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add payment record'
    });
  }
});

// Get payment history for a specific out_id
router.get('/goods-out-payments/:out_id', requireAuth, async (req, res) => {
  try {
    const { out_id } = req.params;
    
    console.log(`[GET /goods-out-payments/${out_id}] Request from user: ${req.user.username}`);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${OUT_PAYMENT_SHEET}!A:E`,
    });

    const rows = response.data.values || [];
    
    if (rows.length <= 1) {
      return res.json({ 
        success: true, 
        data: [] 
      });
    }

    // Filter payments for the specific out_id
    const payments = rows.slice(1)
      .filter(row => row[1] === out_id) // Filter by out_id column
      .map(row => {
        const [out_payment_id, payment_out_id, amount_paid, created_at, created_by] = row;
        
        return {
          out_payment_id: out_payment_id || '',
          out_id: payment_out_id || '',
          amount_paid: parseFloat(amount_paid) || 0,
          created_at: created_at || '',
          created_by: created_by || ''
        };
      });

    console.log(`[GET /goods-out-payments/${out_id}] Returning ${payments.length} payment records`);
    
    res.json({ 
      success: true, 
      data: payments 
    });

  } catch (error) {
    console.error(`[GET /goods-out-payments/${req.params.out_id}] Error:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch payment records' 
    });
  }
});

// Delete goods out record
router.delete('/goods-out/:out_id', requireAuth, async (req, res) => {
  try {
    const { out_id } = req.params;
    
    console.log(`[DELETE /goods-out/${out_id}] Request from user: ${req.user.username}`);
    
    // First, get all data to find the row to delete
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${GOODS_OUT_SHEET}!A:M`, // Updated range
    });

    const rows = response.data.values || [];
    
    if (rows.length <= 1) {
      return res.status(404).json({
        success: false,
        message: 'Goods out record not found'
      });
    }

    // Find the row index for the out_id
    const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === out_id);
    
    if (rowIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Goods out record not found'
      });
    }

    // Delete the row (add 1 because sheets are 1-indexed)
    const sheetRowNumber = rowIndex + 1;
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: 0, // Assumes 'out' is the first sheet, you might need to get actual sheet ID
              dimension: 'ROWS',
              startIndex: sheetRowNumber - 1, // 0-indexed for API
              endIndex: sheetRowNumber
            }
          }
        }]
      }
    });

    console.log(`[DELETE /goods-out/${out_id}] Successfully deleted record`);

    res.json({
      success: true,
      message: 'Goods out record deleted successfully'
    });

  } catch (error) {
    console.error(`[DELETE /goods-out/${req.params.out_id}] Error:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete goods out record'
    });
  }
});

// Update goods out record
router.put('/goods-out/:out_id', requireAuth, async (req, res) => {
  try {
    const { out_id } = req.params;
    const {
      loader,
      company,
      weight,
      truck_no,
      driver_no,
      delivered_weight,
      price_per_kg
    } = req.body;

    console.log(`[PUT /goods-out/${out_id}] Request from user: ${req.user.username}`);

    // Validate required fields - Updated for actual sheet structure
    if (!loader || !weight || !truck_no || !driver_no || !price_per_kg) {
      return res.status(400).json({
        success: false,
        message: 'Loader, weight, truck number, driver number, and price per kg are required'
      });
    }

    // First, get all data to find the row to update
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${GOODS_OUT_SHEET}!A:M`, // Updated range
    });

    const rows = response.data.values || [];
    
    if (rows.length <= 1) {
      return res.status(404).json({
        success: false,
        message: 'Goods out record not found'
      });
    }

    // Find the row index for the out_id
    const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === out_id);
    
    if (rowIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Goods out record not found'
      });
    }

    // Calculate new values based on actual sheet structure
    const actualWeight = parseFloat(weight) || 0;
    const actualDeliveredWeight = parseFloat(delivered_weight) || actualWeight;
    const pricePerKg = parseFloat(price_per_kg) || 0;
    const total_amount = actualDeliveredWeight * pricePerKg;
    const weight_difference = actualDeliveredWeight - actualWeight;
    const profit = weight_difference * pricePerKg;
    
    // Get existing data
    const existingRow = rows[rowIndex];
    const [, , , , , , , , , , , created_at, created_by] = existingRow;

    // Prepare updated row data - Updated to match actual headers
    const updatedRowData = [
      out_id,
      loader,
      company || '',
      actualWeight,
      truck_no,
      driver_no,
      actualDeliveredWeight,
      pricePerKg,
      total_amount,
      weight_difference,
      profit,
      created_at, // Keep original created_at
      created_by // Keep original created_by
    ];

    // Update the specific row
    const sheetRowNumber = rowIndex + 1; // Convert to 1-indexed
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${GOODS_OUT_SHEET}!A${sheetRowNumber}:M${sheetRowNumber}`, // Updated range
      valueInputOption: 'RAW',
      resource: {
        values: [updatedRowData]
      }
    });

    console.log(`[PUT /goods-out/${out_id}] Successfully updated record`);

    res.json({
      success: true,
      message: 'Goods out record updated successfully',
      data: {
        out_id,
        loader,
        company: company || '',
        weight: actualWeight,
        truck_no,
        driver_no,
        delivered_weight: actualDeliveredWeight,
        price_per_kg: pricePerKg,
        total_amount,
        weight_difference,
        profit,
        created_at,
        created_by
      }
    });

  } catch (error) {
    console.error(`[PUT /goods-out/${req.params.out_id}] Error:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to update goods out record'
    });
  }
});

module.exports = router;