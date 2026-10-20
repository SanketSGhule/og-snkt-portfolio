require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const { initDatabase } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads/originals and uploads/thumbnails dirs exist on startup
const uploadsDir = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
const originalsDir = path.join(uploadsDir, 'originals');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
const publicDir = path.join(__dirname, 'public');

[uploadsDir, originalsDir, thumbnailsDir, publicDir].forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    // Silent catch for read-only environments
  }
});

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure express-session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'portfolio-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  })
);

// Serve static files from 'public' directory
app.use(express.static(publicDir));

// Serve '/uploads' from 'uploads' directory
app.use('/uploads', express.static(uploadsDir));

// Mount routers
const apiRouter = require('./routes/api');
const adminRouter = require('./routes/admin');

// Middleware to ensure DB is initialized before processing any requests
let dbReadyPromise = null;
function ensureDbReady() {
  if (!dbReadyPromise) {
    dbReadyPromise = initDatabase()
      .then(() => {
        console.log('Database initialized successfully');
      })
      .catch((err) => {
        console.error('Failed to initialize database:', err);
        dbReadyPromise = null;
        throw err;
      });
  }
  return dbReadyPromise;
}

// Start DB init on boot
ensureDbReady();

app.use(async (req, res, next) => {
  try {
    await ensureDbReady();
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/api', apiRouter);
app.use('/api/admin', adminRouter);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start listening if not running as a Vercel serverless function
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`OG.SNKT Portfolio running on http://localhost:${PORT}`);
  });
}

module.exports = app;
