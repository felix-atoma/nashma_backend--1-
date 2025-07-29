// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

// Apply admin protection to all routes in this file
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

// Admin User Management
router.route('/users')
  .get(userController.getAllUsers);

router.route('/users/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

// Admin Management
router.post('/admins', authController.createAdmin);
router.patch('/admins/:userId/set-role', authController.setAdminRole);

// Admin Dashboard Stats (example - implement as needed)
router.get('/stats', (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      users: 150,
      admins: 5,
      activeSessions: 87
    }
  });
});

module.exports = router;