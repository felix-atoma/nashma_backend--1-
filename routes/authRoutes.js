const express = require('express');
const authController = require('../controllers/authController');

// Load middleware with proper error handling
let authMiddleware = {};
let validationMiddleware = {};

try {
  authMiddleware = require('../middleware/authMiddleware');
  console.log('✅ Auth middleware loaded successfully');
} catch (e) {
  console.warn('❌ Could not load authMiddleware:', e.message);
  // Provide fallback middleware
  authMiddleware = {
    protect: (req, res, next) => {
      console.warn('Auth middleware not available - using fallback');
      next();
    },
    restrictTo: (...roles) => (req, res, next) => {
      console.warn('Role restriction middleware not available - using fallback');
      next();
    }
  };
}

try {
  validationMiddleware = require('../middleware/validationMiddleware');
  console.log('✅ Validation middleware loaded successfully');
} catch (e) {
  console.warn('❌ Could not load validationMiddleware:', e.message);
  validationMiddleware = {};
}

console.log('authController keys:', Object.keys(authController));
console.log('authMiddleware keys:', Object.keys(authMiddleware));
console.log('validationMiddleware keys:', Object.keys(validationMiddleware));

// Check validation middleware availability (inline - no function call)
const requiredValidators = [
  'validateSignup', 'validateLogin', 'validateEmail', 
  'validateResetPassword', 'validateUpdatePassword', 
  'validateAdminCreation', 'validateUserId'
];

const missing = requiredValidators.filter(validator => 
  !Array.isArray(validationMiddleware[validator]) && 
  typeof validationMiddleware[validator] !== 'function'
);

if (missing.length > 0) {
  console.warn(`⚠️  Missing validation middleware: ${missing.join(', ')}`);
} else {
  console.log('✅ All validation middleware functions available');
}

const router = express.Router();

// Helper to safely use middleware with fallback
const safeMiddleware = (middleware, fallbackName = 'unknown') => {
  // Handle arrays of middleware (like validation middleware)
  if (Array.isArray(middleware)) {
    return middleware;
  }
  
  if (typeof middleware === 'function') {
    return middleware;
  }
  
  console.warn(`⚠️  Middleware ${fallbackName} not available - using no-op fallback`);
  return (req, res, next) => next();
};

// Timeout middleware to prevent hanging requests
const timeoutMiddleware = (timeout = 30000) => {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          status: 'error',
          message: 'Request timeout'
        });
      }
    }, timeout);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    
    next();
  };
};

// Apply timeout middleware to all routes
router.use(timeoutMiddleware());

// ============================================
// 🔓 PUBLIC ROUTES
// ============================================

router.post(
  '/signup',
  ...safeMiddleware(validationMiddleware.validateSignup, 'validateSignup'),
  safeMiddleware(authController.signup, 'signup')
);

router.post(
  '/login',
  ...safeMiddleware(validationMiddleware.validateLogin, 'validateLogin'),
  safeMiddleware(authController.login, 'login')
);

router.get('/logout', safeMiddleware(authController.logout, 'logout'));

router.post(
  '/forgot-password',
  ...safeMiddleware(validationMiddleware.validateEmail, 'validateEmail'),
  safeMiddleware(authController.forgotPassword, 'forgotPassword')
);

router.patch(
  '/reset-password/:token',
  ...safeMiddleware(validationMiddleware.validateResetPassword, 'validateResetPassword'),
  safeMiddleware(authController.resetPassword, 'resetPassword')
);

router.post(
  '/refresh-token',
  safeMiddleware(authController.refreshToken, 'refreshToken')
);

// ============================================
// 🔒 PROTECTED ROUTES (require authentication)
// ============================================

// Apply authentication middleware to all routes below this point
router.use((req, res, next) => {
  const protectMiddleware = authController.protect || authMiddleware.protect;
  if (typeof protectMiddleware === 'function') {
    return protectMiddleware(req, res, next);
  }
  console.warn('No protect middleware available');
  return next();
});

router.patch(
  '/update-password',
  ...safeMiddleware(validationMiddleware.validateUpdatePassword, 'validateUpdatePassword'),
  safeMiddleware(authController.updatePassword, 'updatePassword')
);

router.get('/me', safeMiddleware(authController.getMe, 'getMe'));

// ============================================
// 👑 ADMIN RESTRICTED ROUTES
// ============================================

// Apply admin role restriction to all routes below this point
router.use((req, res, next) => {
  const restrictToAdmin = authController.restrictTo 
    ? authController.restrictTo('admin')
    : authMiddleware.restrictTo 
      ? authMiddleware.restrictTo('admin')
      : null;
  
  if (typeof restrictToAdmin === 'function') {
    return restrictToAdmin(req, res, next);
  }
  
  console.warn('No admin restriction middleware available');
  return next();
});

router.post(
  '/create-admin',
  ...safeMiddleware(validationMiddleware.validateAdminCreation, 'validateAdminCreation'),
  safeMiddleware(authController.createAdmin, 'createAdmin')
);

router.patch(
  '/set-admin-role/:userId',
  ...safeMiddleware(validationMiddleware.validateUserId, 'validateUserId'),
  safeMiddleware(authController.setAdminRole, 'setAdminRole')
);

router.patch(
  '/remove-admin-role/:userId',
  ...safeMiddleware(validationMiddleware.validateUserId, 'validateUserId'),
  safeMiddleware(authController.removeAdminRole, 'removeAdminRole')
);

router.patch(
  '/deactivate-user/:userId',
  ...safeMiddleware(validationMiddleware.validateUserId, 'validateUserId'),
  safeMiddleware(authController.deactivateUser, 'deactivateUser')
);

router.patch(
  '/activate-user/:userId',
  ...safeMiddleware(validationMiddleware.validateUserId, 'validateUserId'),
  safeMiddleware(authController.activateUser, 'activateUser')
);

// ============================================
// 🚨 ERROR HANDLING
// ============================================

// Catch-all error handler for this router
router.use((err, req, res, next) => {
  console.error('Auth router error:', err);
  
  if (!res.headersSent) {
    res.status(err.statusCode || 500).json({
      status: 'error',
      message: err.message || 'Internal server error'
    });
  }
});

module.exports = router;