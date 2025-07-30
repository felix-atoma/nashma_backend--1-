const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Public
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Require login
router.use(authMiddleware.protect);

// User-only
router.patch('/updatePassword', authController.updatePassword);
router.get('/me', authController.getMe);

// Admin-only
router.use(authMiddleware.restrictTo('admin'));
router.post('/createAdmin', authController.createAdmin);
router.patch(
  '/setAdminRole/:userId',
  authController.setAdminRole
);
router.patch(
  '/removeAdminRole/:userId',
  authController.removeAdminRole
);

module.exports = router;
