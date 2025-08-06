const express = require('express');
const cartController = require('../controllers/cartController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes (require authentication)
router.use(authController.protect);

// GET /api/cart - Get user's cart
// POST /api/cart - Add item to cart
// DELETE /api/cart - Clear entire cart
router
  .route('/')
  .get(cartController.getCart)
  .post(cartController.addToCart)
  .delete(cartController.clearCart);

// DELETE /api/cart/:productId - Remove specific item from cart
router
  .route('/:productId')
  .delete(cartController.removeFromCart);

// PATCH /api/cart/items - Update multiple cart items
router
  .route('/items')
  .patch(cartController.updateCartItems);

// POST /api/cart/apply-coupon - Apply coupon to cart
router
  .route('/apply-coupon')
  .post(cartController.applyCoupon);

// DELETE /api/cart/remove-coupon - Remove coupon from cart
router
  .route('/remove-coupon')
  .delete(cartController.removeCoupon);

module.exports = router;