const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all cart routes
router.use(authMiddleware.protect);

router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.delete('/:productId', cartController.removeFromCart);
router.delete('/', cartController.clearCart);

module.exports = router;