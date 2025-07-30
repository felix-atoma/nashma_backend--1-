const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const authMiddleware = require('../middleware/authMiddleware');

// Public route
router.post('/', contactController.submitContact);

// Protected admin routes
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('admin'));

router.get('/', contactController.getAllContacts);
router.get('/:id', contactController.getContact);
router.delete('/:id', contactController.deleteContact);

module.exports = router;