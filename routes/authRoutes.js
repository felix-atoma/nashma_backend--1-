const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

// ==================== PUBLIC ROUTES ====================
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

// ==================== PROTECTED ROUTES (Require Login) ====================
router.use(authController.protect); // Applies to all routes below

router.patch('/update-my-password', authController.updatePassword);
router.get('/me', userController.getMe, userController.getUser);
router.patch('/update-me', userController.updateMe);
router.delete('/delete-me', userController.deleteMe);

// ==================== ADMIN-ONLY ROUTES ====================
router.use(authController.restrictTo('admin')); // Applies to all routes below

// User Management
router.route('/')
  .get(userController.getAllUsers);

router.route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

// Admin Management
router.post('/create-admin', authController.createAdmin);
router.patch('/set-admin/:userId', authController.setAdminRole);

module.exports = router;