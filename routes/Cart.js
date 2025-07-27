const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');


router.get('/', productController.getAllProducts);
router.get('/cart', protect, productController.getCart);
router.post('/cart', protect, productController.addToCart);
router.delete('/cart/:productId', protect, productController.removeFromCart);
router.delete('/cart', protect, productController.clearCart);

module.exports = router;