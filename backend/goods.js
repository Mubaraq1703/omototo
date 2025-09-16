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
const PRICE_SHEET = 'price_per_kg'; // Sheet name for price data

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

// Helper function to fetch latest price per kg
const fetchLatestPricePerKg = async () => {
  try {
    console.log(`[fetchLatestPricePerKg] Attempting to fetch from sheet: ${PRICE_SHEET}`);
    console.log(`[fetchLatestPricePerKg] Using spreadsheet ID: ${SPREADSHEET_ID}`);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PRICE_SHEET}!A:C`, // Assuming columns: id, price_per_kg, created_at
    });

    console.log(`[fetchLatestPricePerKg] Response received:`, response.data);
    
    const rows = response.data.values || [];
    console.log(`[fetchLatestPricePerKg] Total rows found: ${rows.length}`);
    
    if (rows.length <= 1) {
      console.log('[fetchLatestPricePerKg] No data rows found (only header or empty)');
      throw new Error('No price data available in price_per_kg sheet');
    }

    // Log all rows for debugging
    console.log('[fetchLatestPricePerKg] All rows:', rows);
    
    // Sort by created_at (assuming column C) to get the latest
    const priceData = rows.slice(1)
      .map((row, index) => {
        console.log(`[fetchLatestPricePerKg] Processing row ${index + 1}:`, row);
        return {
          id: row[0] || `row_${index}`,
          price_per_kg: parseFloat(row[1]) || 0,
          created_at: row[2] ? new Date(row[2]) : new Date(Date.now() - index * 1000) // Fallback with decreasing timestamps
        };
      })
      .filter(item => item.price_per_kg > 0) // Only include valid prices
      .sort((a, b) => b.created_at - a.created_at);

    console.log('[fetchLatestPricePerKg] Processed and sorted price data:', priceData);
    
    if (priceData.length === 0) {
      console.log('[fetchLatestPricePerKg] No valid price data found after processing');
      throw new Error('No valid price data found in price_per_kg sheet');
    }

    const latestPrice = priceData[0].price_per_kg;
    console.log(`[fetchLatestPricePerKg] Latest price found: ${latestPrice}`);
    
    return latestPrice;
  } catch (error) {
    console.error('[fetchLatestPricePerKg] Error details:', error.message);
    console.error('[fetchLatestPricePerKg] Full error:', error);
    
    // Try to provide more specific error information
    if (error.message.includes('Unable to parse range')) {
      console.error('[fetchLatestPricePerKg] Sheet name might be incorrect or sheet does not exist');
    }
    
    // Don't return a default price - let the error bubble up
    throw new Error(`Failed to fetch price data: ${error.message}`);
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
      paid_amount
    } = req.body;

    // Validate required fields (paid_amount is now optional)
    if (!name || !weight || !acct_no || !bank || !phone_no) {
      return res.status(400).json({
        success: false,
        message: 'Name, weight, account number, bank, and phone number are required'
      });
    }

    // Handle optional paid_amount - default to 0 if not provided or invalid
    const paidAmount = paid_amount && !isNaN(parseFloat(paid_amount)) ? parseFloat(paid_amount) : 0;

    // Fetch latest price per kg
    let price_per_kg;
    try {
      price_per_kg = await fetchLatestPricePerKg();
      console.log(`[POST /goods-in] Latest price per kg fetched successfully: ${price_per_kg}`);
    } catch (priceError) {
      console.error('[POST /goods-in] Failed to fetch price:', priceError.message);
      return res.status(500).json({
        success: false,
        message: `Unable to fetch current price: ${priceError.message}. Please ensure the price_per_kg sheet exists and has valid data.`
      });
    }
    
    // Calculate total amount based on weight and fetched price
    const total_amount = parseFloat(weight) * price_per_kg;
    
    // Generate unique ID
    const timestamp = Date.now();
    const in_id = `IN${timestamp}`;
    
    const debt = 0; // Debt field kept for compatibility but not used for status
    const created_at = new Date().toISOString();
    
    // Use full name (first_name + surname) for created_by
    const created_by = `${req.user.first_name} ${req.user.surname}`;

    // Prepare row data for in sheet
    const rowData = [
      in_id,
      name,
      parseFloat(weight),
      price_per_kg,
      total_amount,
      acct_no,
      bank,
      phone_no,
      debt,
      created_at,
      created_by
    ];

    console.log(`[POST /goods-in] Adding new record by user: ${created_by}`);
    console.log('[POST /goods-in] Row data:', rowData);

    // Append to in sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${GOODS_IN_SHEET}!A:K`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData]
      }
    });

    console.log(`[POST /goods-in] Successfully added record with ID: ${in_id}`);

    // Generate unique payment ID for initial payment
    const payment_timestamp = Date.now() + 1; // Ensure different timestamp
    const in_payment_id = `PAY${payment_timestamp}`;
    
    // Prepare payment record data using user-provided paid amount
    const paymentRowData = [
      in_payment_id,
      in_id,
      paidAmount, // Use the validated paidAmount instead of parseFloat(paid_amount)
      created_at,
      created_by
    ];

    console.log('[POST /goods-in] Adding payment record:', paymentRowData);

    // Only add payment record if there's an actual payment amount
    if (paidAmount > 0) {
      // Append to payment sheet
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${PAYMENT_SHEET}!A:E`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [paymentRowData]
        }
      });

      console.log(`[POST /goods-in] Successfully added payment record with ID: ${in_payment_id}`);
    } else {
      console.log('[POST /goods-in] No payment amount provided, skipping payment record creation');
    }

    res.json({
      success: true,
      message: 'Goods in record and payment added successfully',
      data: {
        in_id,
        name,
        weight: parseFloat(weight),
        price_per_kg: price_per_kg,
        amount: total_amount,
        acct_no,
        bank,
        phone_no,
        debt,
        created_at,
        created_by,
        payment_id: paidAmount > 0 ? in_payment_id : null,
        amount_paid: paidAmount,
        status: paidAmount >= total_amount ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid')
      }
    });

  } catch (error) {
    console.error('[POST /goods-in] Error adding goods record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add goods record: ' + error.message
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
    const created_by = `${req.user.first_name} ${req.user.surname}`;

    // Prepare row data for payment sheet
    const paymentRowData = [
      in_payment_id,
      in_id,
      parseFloat(amount_paid),
      created_at,
      created_by
    ];

    console.log(`[POST /payment] Adding payment record by user: ${created_by}`);
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

// Get dashboard statistics with optional date filtering
router.get('/dashboard-stats', requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    console.log(`[GET /dashboard-stats] Request from user: ${req.user.username}`);
    console.log(`[GET /dashboard-stats] Date range: ${start_date} to ${end_date}`);
    
    // Parse dates if provided
    let startDate = null;
    let endDate = null;
    
    if (start_date) {
      startDate = new Date(start_date);
      startDate.setHours(0, 0, 0, 0); // Start of day
    }
    
    if (end_date) {
      endDate = new Date(end_date);
      endDate.setHours(23, 59, 59, 999); // End of day
    }
    
    // Fetch data from all relevant sheets
    const [inResponse, outResponse, inPaymentResponse, outPaymentResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'in!A:K',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'out!A:K',
      }).catch(() => ({ data: { values: [] } })), // Handle if sheet doesn't exist
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'in_payment!A:E',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'out_payment!A:E',
      }).catch(() => ({ data: { values: [] } })) // Handle if sheet doesn't exist
    ]);
    
    // Helper function to filter rows by date
    const filterByDate = (rows, dateColumnIndex) => {
      if (!startDate && !endDate) return rows;
      
      return rows.filter(row => {
        const dateStr = row[dateColumnIndex];
        if (!dateStr) return false;
        
        const rowDate = new Date(dateStr);
        if (isNaN(rowDate.getTime())) return false;
        
        if (startDate && rowDate < startDate) return false;
        if (endDate && rowDate > endDate) return false;
        
        return true;
      });
    };
    
    // Process in sheet data (weight and created_at)
    const inRows = inResponse.data.values || [];
    const filteredInRows = inRows.length > 1 ? filterByDate(inRows.slice(1), 9) : []; // created_at is column 9 (index 9)
    
    // Process out sheet data (weight and created_at)
    const outRows = outResponse.data.values || [];
    const filteredOutRows = outRows.length > 1 ? filterByDate(outRows.slice(1), 9) : []; // created_at is column 9
    
    // Process in_payment data (paid_amount and created_at)
    const inPaymentRows = inPaymentResponse.data.values || [];
    const filteredInPaymentRows = inPaymentRows.length > 1 ? filterByDate(inPaymentRows.slice(1), 3) : []; // created_at is column 3
    
    // Process out_payment data (paid_amount and created_at)
    const outPaymentRows = outPaymentResponse.data.values || [];
    const filteredOutPaymentRows = outPaymentRows.length > 1 ? filterByDate(outPaymentRows.slice(1), 3) : []; // created_at is column 3
    
    // Calculate statistics
    const totalWeightIn = filteredInRows.reduce((sum, row) => {
      const weight = parseFloat(row[2]) || 0; // weight is column 2
      return sum + weight;
    }, 0);
    
    const totalWeightOut = filteredOutRows.reduce((sum, row) => {
      const weight = parseFloat(row[2]) || 0; // weight is column 2
      return sum + weight;
    }, 0);
    
    const amountPaid = filteredInPaymentRows.reduce((sum, row) => {
      const paid = parseFloat(row[2]) || 0; // paid_amount is column 2
      return sum + paid;
    }, 0);
    
    const amountGenerated = filteredOutPaymentRows.reduce((sum, row) => {
      const paid = parseFloat(row[2]) || 0; // paid_amount is column 2
      return sum + paid;
    }, 0);
    
    const profit = amountGenerated - amountPaid;
    
    console.log(`[GET /dashboard-stats] Calculated stats - Weight In: ${totalWeightIn}, Weight Out: ${totalWeightOut}, Paid: ${amountPaid}, Generated: ${amountGenerated}, Profit: ${profit}`);
    
    res.json({
      success: true,
      data: {
        totalWeightIn,
        totalWeightOut,
        amountPaid,
        amountGenerated,
        profit
      }
    });
    
  } catch (error) {
    console.error('[GET /dashboard-stats] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

// Test endpoint to check price_per_kg sheet access
router.get('/test-price-sheet', requireAuth, async (req, res) => {
  try {
    console.log('[GET /test-price-sheet] Testing access to price_per_kg sheet');
    const price = await fetchLatestPricePerKg();
    res.json({
      success: true,
      message: 'Price sheet access successful',
      data: {
        latest_price: price,
        sheet_name: PRICE_SHEET,
        spreadsheet_id: SPREADSHEET_ID
      }
    });
  } catch (error) {
    console.error('[GET /test-price-sheet] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      sheet_name: PRICE_SHEET,
      spreadsheet_id: SPREADSHEET_ID
    });
  }
});

// Get latest price per kg
router.get('/latest-price', requireAuth, async (req, res) => {
    try {
        console.log('[GET /latest-price] Fetching latest price per kg');
        console.log('[GET /latest-price] Using spreadsheet ID:', SPREADSHEET_ID);
        console.log('[GET /latest-price] Using sheet name:', PRICE_SHEET);
        
        // Try to get data from price_per_kg sheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${PRICE_SHEET}!A:C`, // id, price_per_kg, created_at
        });

        console.log('[GET /latest-price] Raw response:', JSON.stringify(response.data, null, 2));
        const rows = response.data.values || [];
        console.log('[GET /latest-price] Total rows received:', rows.length);
        
        if (rows.length <= 1) {
            console.log('[GET /latest-price] No data rows found (only header or empty)');
            console.log('[GET /latest-price] Rows content:', rows);
            return res.json({ 
                success: true,
                price: 1000,
                message: 'No price data found, using default',
                debug: { total_rows: rows.length, rows: rows }
            });
        }

        // Process the data
        const dataRows = rows.slice(1); // Skip header
        console.log('[GET /latest-price] Processing data rows:', dataRows.length);
        console.log('[GET /latest-price] First few data rows:', dataRows.slice(0, 3));
        
        if (dataRows.length === 0) {
            console.log('[GET /latest-price] No data rows after header skip');
            return res.json({ 
                success: true,
                price: 1000,
                message: 'No data rows found after header',
                debug: { total_rows: rows.length, data_rows: 0 }
            });
        }
        
        // Find the row with the most recent created_at
        let latestRow = dataRows[0];
        let latestDate = new Date(latestRow[2] || '1970-01-01');
        console.log('[GET /latest-price] First row data:', latestRow);
        console.log('[GET /latest-price] First row date:', latestDate);
        
        for (let i = 1; i < dataRows.length; i++) {
            const rowDate = new Date(dataRows[i][2] || '1970-01-01');
            console.log(`[GET /latest-price] Row ${i} date:`, rowDate);
            if (rowDate > latestDate) {
                latestDate = rowDate;
                latestRow = dataRows[i];
                console.log('[GET /latest-price] New latest row found:', latestRow);
            }
        }
        
        console.log('[GET /latest-price] Final latest row:', latestRow);
        console.log('[GET /latest-price] Price column value (raw):', latestRow[1]);
        
        const latestPrice = parseFloat(latestRow[1]);
        console.log('[GET /latest-price] Parsed price:', latestPrice);
        
        if (isNaN(latestPrice) || latestPrice <= 0) {
            console.log('[GET /latest-price] Invalid price value, using default');
            return res.json({ 
                success: true,
                price: 1000,
                message: 'Invalid price value found, using default',
                debug: { 
                    raw_value: latestRow[1], 
                    parsed_value: latestPrice,
                    latest_row: latestRow 
                }
            });
        }
        
        console.log('[GET /latest-price] Returning valid price:', latestPrice);
        
        res.json({ 
            success: true,
            price: latestPrice,
            date: latestRow[2] || 'No date',
            total_rows: dataRows.length,
            latest_row: latestRow
        });
        
    } catch (error) {
        console.error('[GET /latest-price] Error details:', error.message);
        console.error('[GET /latest-price] Full error:', error);
        
        res.json({ 
            success: false,
            price: 1000,
            error: error.message,
            message: 'Error fetching price, using default'
        });
    }
});

module.exports = router;