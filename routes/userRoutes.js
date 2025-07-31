// routes/userRoutes.js

const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require login
router.use(authMiddleware.protect);

// Profile routes
router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);

// Admin-only
router.use(authMiddleware.restrictTo('admin'));

router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.get('/admins', userController.getAllAdmins);
router.get('/stats', userController.getAdminStats);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
