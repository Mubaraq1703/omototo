require('dotenv').config();
const express = require('express');
const path = require('path'); // Import path module
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { google } = require('googleapis');
const registerRoutes = require('./register');
const authRoutes = require('./auth'); // Import new auth routes
const goodsRoutes = require('./goods'); // Import goods routes

const app = express();
const PORT = process.env.PORT || 3000;

// --- Google Sheets API Initialization ---
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID_APP;
const SESSIONS_SHEET = 'session';

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080', // Adjusted for consistency
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// --- Serve Static Files ---
// This must come before API routes and after primary middleware
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Logging middleware
app.use((req, res, next) => {
  // Don't log requests for static assets for cleaner logs
  if (req.path.startsWith('/api')) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  }
  next();
});

// --- Custom Session Middleware ---
app.use(async (req, res, next) => {
  const { session_id } = req.cookies;
  console.log(`[Session Middleware] Request for: ${req.path}, Session ID from cookie: ${session_id}`);

  if (!session_id) {
    console.log('[Session Middleware] No session ID found in cookie.');
    return next();
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SESSIONS_SHEET}!A:J`, // Corrected range to A:J
    });

    const rows = response.data.values || [];
    // Find session from bottom to top to get the latest one for a user
    const sessionRow = [...rows].reverse().find(row => row[0] === session_id);

    if (sessionRow) {
      const [id, userId, ip, userAgent, data, createdAt, lastAccessed, expiresAt, isActive, location] = sessionRow;
      const now = new Date();
      const expiryDate = new Date(expiresAt);

      console.log(`[Session Middleware] Session found: ${id}`);
      console.log(`[Session Middleware] isActive: ${isActive}, expiresAt: ${expiresAt}, now: ${now}`);

      if (isActive.toLowerCase() === 'true' && now < expiryDate) {
        req.user = JSON.parse(data); // Attach user data to request
        req.session_id = id;
        console.log(`[Session Middleware] Session VALID. User: ${req.user.username}`);
      } else {
        console.log('[Session Middleware] Session INVALID (inactive or expired).');
        // Clear cookie if session is invalid or expired
        res.clearCookie('session_id');
      }
    } else {
      console.log('[Session Middleware] Session ID not found in sheet.');
      res.clearCookie('session_id'); // Clear invalid cookie
    }
  } catch (error) {
    console.error('[Session Middleware] Error processing session:', error);
  }

  next();
});


// Test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API Routes
app.use('/api/auth', registerRoutes);
app.use('/api/auth', authRoutes); // Use new auth routes
app.use('/api', goodsRoutes); // Use goods routes

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API route not found' 
  });
});

// Fallback for client-side routing (serves index.html for any non-API, non-file request)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;