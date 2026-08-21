// Middleware to protect routes that require admin authentication
const authMiddleware = (req, res, next) => {
  if (req.session && req.session.admin) {
    return next();
  }

  // If request is an API request, return JSON error
  if (req.xhr || req.originalUrl.startsWith('/api') || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Please login to continue.',
    });
  }

  // Otherwise redirect to admin login
  return res.redirect('/admin/login');
};

// Middleware to inject admin info into response locals for views
const checkAdmin = (req, res, next) => {
  res.locals.admin = req.session && req.session.admin ? req.session.admin : null;
  res.locals.isAuthenticated = Boolean(req.session && req.session.admin);
  next();
};

module.exports = {
  authMiddleware,
  checkAdmin,
};
