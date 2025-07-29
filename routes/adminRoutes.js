const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

// Protect all admin routes
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

// Admin User Management
router.route('/users')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router.route('/users/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

// Admin Management
router.route('/admins')
  .get(userController.getAllAdmins)
  .post(authController.createAdmin);

router.route('/admins/:userId/set-role')
  .patch(authController.setAdminRole)
  .delete(authController.removeAdminRole);

// Admin Dashboard Stats
router.get('/stats', userController.getAdminStats);

module.exports = router;