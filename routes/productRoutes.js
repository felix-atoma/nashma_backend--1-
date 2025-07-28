const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct // ✅ include this
} = require('../controllers/productController');

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', createProduct); // ✅ POST route to create product

module.exports = router;
