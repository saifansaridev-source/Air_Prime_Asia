const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const { authMiddleware } = require('../middleware/auth');

// GET /admin/login - Render Login Page
router.get('/login', (req, res) => {
  if (req.session && req.session.admin) {
    return res.redirect('/admin/panel');
  }
  res.render('admin-login', {
    error: null,
    title: 'Admin Login | Air Prime Asia',
  });
});

// POST /admin/login - Authenticate Admin
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required.',
        });
      }
      return res.render('admin-login', {
        error: 'Username and password are required.',
        title: 'Admin Login | Air Prime Asia',
      });
    }

    // Find admin by username (case-insensitive)
    const admin = await Admin.findOne({
      username: { $regex: new RegExp(`^${username.trim()}$`, 'i') },
    });

    if (!admin) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password.',
        });
      }
      return res.render('admin-login', {
        error: 'Invalid username or password.',
        title: 'Admin Login | Air Prime Asia',
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password.',
        });
      }
      return res.render('admin-login', {
        error: 'Invalid username or password.',
        title: 'Admin Login | Air Prime Asia',
      });
    }

    // Set session data
    req.session.admin = {
      id: admin._id,
      username: admin.username,
    };

    // Save session explicitly before redirect/response
    req.session.save((err) => {
      if (err) {
        console.error('[Session Error]', err);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
          return res.status(500).json({
            success: false,
            message: 'Session initialization failed.',
          });
        }
        return res.render('admin-login', {
          error: 'An error occurred. Please try again.',
          title: 'Admin Login | Air Prime Asia',
        });
      }

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(200).json({
          success: true,
          message: 'Login successful',
          redirectUrl: '/admin/panel',
        });
      }

      return res.redirect('/admin/panel');
    });
  } catch (error) {
    console.error('[Login Error]', error);
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error occurred.',
      });
    }
    res.render('admin-login', {
      error: 'Internal server error occurred.',
      title: 'Admin Login | Air Prime Asia',
    });
  }
});

// GET /admin/panel - Protected Admin Panel Page
router.get('/panel', authMiddleware, (req, res) => {
  res.render('admin-panel', {
    admin: req.session.admin,
    title: 'Admin Panel — Gallery | Air Prime Asia',
  });
});

// GET /admin/logout - Logout Admin
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('[Logout Error]', err);
    }
    res.clearCookie('connect.sid');
    res.redirect('/admin/login');
  });
});

// POST /admin/logout - API Logout Admin
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('[Logout Error]', err);
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ success: true, redirectUrl: '/admin/login' });
  });
});

module.exports = router;
