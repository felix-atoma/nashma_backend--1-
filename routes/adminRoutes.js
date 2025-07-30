// routes/adminRoutes.js

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

const router = express.Router();

// 1) All admin routes require a valid user
router.use(authMiddleware.protect);

// 2) Only users with role “admin” can hit these
router.use(authMiddleware.restrictTo('admin'));

// 3) Admin-management endpoints
//    – Create a new admin
router.post('/create', authController.createAdmin);

//    – Promote a user to admin
router.patch('/setRole/:userId', authController.setAdminRole);

//    – Demote an admin back to user
router.patch('/removeRole/:userId', authController.removeAdminRole);

// 4) User-management & stats
router
  .route('/users')
  .get(userController.getAllUsers);

router
  .route('/admins')
  .get(userController.getAllAdmins);

router
  .route('/stats')
  .get(userController.getAdminStats);

module.exports = router;
