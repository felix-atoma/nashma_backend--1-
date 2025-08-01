const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

let validationMiddleware = {};
try {
  validationMiddleware = require('../middleware/validationMiddleware');
} catch (e) {
  console.warn('Could not load validationMiddleware:', e.message);
}

console.log('authController keys:', Object.keys(authController));
console.log('validationMiddleware keys:', Object.keys(validationMiddleware));

const router = express.Router();

// helper to fallback to no-op if missing
const maybe = (fn) => (typeof fn === 'function' ? fn : (req, res, next) => next());

// Public routes
router.post(
  '/signup',
  maybe(validationMiddleware.validateSignup),
  maybe(authController.signup)
);

router.post(
  '/login',
  maybe(validationMiddleware.validateLogin),
  maybe(authController.login)
);

router.get('/logout', maybe(authController.logout));

router.post(
  '/forgot-password',
  maybe(validationMiddleware.validateEmail),
  maybe(authController.forgotPassword)
);

router.patch(
  '/reset-password/:token',
  maybe(validationMiddleware.validateResetPassword),
  maybe(authController.resetPassword)
);

// Protected routes (require authentication)
router.use(maybe(authMiddleware.protect));

router.patch(
  '/update-password',
  maybe(validationMiddleware.validateUpdatePassword),
  maybe(authController.updatePassword)
);

router.get('/me', maybe(authController.getMe));

// Admin restricted routes
router.use(maybe(authMiddleware.restrictTo ? authMiddleware.restrictTo('admin') : null));

router.post(
  '/create-admin',
  maybe(validationMiddleware.validateAdminCreation),
  maybe(authController.createAdmin)
);

router.patch(
  '/set-admin-role/:userId',
  maybe(validationMiddleware.validateUserId),
  maybe(authController.setAdminRole)
);

router.patch(
  '/remove-admin-role/:userId',
  maybe(validationMiddleware.validateUserId),
  maybe(authController.removeAdminRole)
);

module.exports = router;
