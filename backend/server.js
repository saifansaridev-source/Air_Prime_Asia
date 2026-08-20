const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const { checkAdmin } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const galleryRoutes = require('./routes/gallery');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas
connectDB();

// CORS configuration
app.use(cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'airprime_session_secret_key_2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true if running with HTTPS behind a reverse proxy
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Global view locals middleware
app.use(checkAdmin);

// Set View Engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));
// Also serve static assets from parent directory (images/css/js) if referenced in views
app.use('/images', express.static(path.join(__dirname, '..', 'images')));
app.use('/css', express.static(path.join(__dirname, '..', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', 'js')));
app.use('/assests', express.static(path.join(__dirname, '..', 'assests')));

// Routes
app.use('/admin', authRoutes);
app.use('/api/gallery', galleryRoutes);

// Root redirect
app.get('/', (req, res) => {
  if (req.session && req.session.admin) {
    return res.redirect('/admin/panel');
  }
  res.redirect('/admin/login');
});

// 404 Handler
app.use((req, res) => {
  if (req.xhr || req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Resource not found' });
  }
  res.status(404).render('admin-login', {
    error: 'Page not found.',
    title: '404 - Not Found | Air Prime Asia',
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  if (req.xhr || req.originalUrl.startsWith('/api')) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal Server Error',
    });
  }
  res.status(500).send('Internal Server Error');
});

// Start Server (local dev only)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
  console.log(`\nðŸš€ [Air Prime Admin Server] Running at: http://localhost:${PORT}`);
  console.log(`ðŸ” Admin Login URL: http://localhost:${PORT}/admin/login\n`);
  });
}

module.exports = app;
