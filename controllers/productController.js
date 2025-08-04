const Product = require('../models/Product');

// GET /api/products
const getAllProducts = async (req, res) => {
  try {
    console.log('🔍 Fetching products...');
    console.log('🔍 Product model collection:', Product.collection.name);
    
    // Count documents first
    const count = await Product.countDocuments();
    console.log('📊 Total products in collection:', count);
    
    // Get all products
    const products = await Product.find();
    console.log('📦 Products fetched:', products.length);
    
    if (products.length > 0) {
      console.log('🆔 First product ID:', products[0]._id);
      console.log('📅 First product created:', products[0].createdAt);
      console.log('🏷️ First product name:', products[0].name);
    }
    
    res.json(products);
  } catch (error) {
    console.error('❌ Error in getAllProducts:', error);
    res.status(500).json({ message: 'Failed to fetch products', error: error.message });
  }
};

// GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product' });
  }
};

// POST /api/products
const createProduct = async (req, res) => {
  try {
    const { name, description, price, countInStock, image } = req.body;
    
    const product = new Product({
      name,
      description,
      price,
      countInStock,
      image
    });
    
    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error creating product' });
  }
};

// IMPORTANT: Make sure to export all functions
module.exports = {
  getAllProducts,
  getProductById,
  createProduct
};