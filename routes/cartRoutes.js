const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// Unprotected routes (no login needed)
router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.delete('/:productId', cartController.removeFromCart);
router.delete('/', cartController.clearCart);

module.exports = router;
