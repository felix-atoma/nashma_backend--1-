const express = require('express');
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all cart routes
router.use(authMiddleware.protect);

// GET /api/cart - Get user's cart
router.get('/', cartController.getCart);

// POST /api/cart - Add item to cart
router.post('/', 
  express.json(), // Body parser
  cartController.addToCart
);

// PATCH /api/cart - Bulk update cart items
router.patch('/',
  express.json(),
  cartController.updateCart
);

// DELETE /api/cart/:productId - Remove specific item
router.delete('/:productId', cartController.removeFromCart);

// DELETE /api/cart - Clear entire cart
router.delete('/', cartController.clearCart);

//  test rout
router.get('/test', (req, res) => {
  res.json({ msg: 'Cart route works' });
});

module.exports = router;