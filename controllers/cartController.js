const Cart = require('../models/Cart');
const Product = require('../models/Product');

exports.getCart = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    
    const cart = await Cart.findOne({ userId: req.user._id })
      .populate('items.product', 'name price images');
      
    if (!cart) return res.json({ items: [], total: 0 });
    
    res.json({
      items: cart.items,
      total: cart.total
    });
  } catch (err) {
    console.error('Get cart error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addToCart = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    
    const { productId, quantity = 1 } = req.body;
    
    // Validate input
    if (!productId) return res.status(400).json({ message: 'Product ID is required' });
    if (quantity < 1 || quantity > 100) {
      return res.status(400).json({ message: 'Quantity must be between 1 and 100' });
    }

    // Check product exists
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Find or create cart
    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) cart = new Cart({ userId: req.user._id, items: [] });

    // Update existing item or add new one
    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );
    
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    res.json({
      items: cart.items,
      total: cart.total
    });
  } catch (err) {
    console.error('Add to cart error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: Object.values(err.errors).map(e => e.message) 
      });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    
    const { productId } = req.params;
    if (!productId) return res.status(400).json({ message: 'Product ID is required' });

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.items = cart.items.filter(
      item => item.product.toString() !== productId
    );

    await cart.save();
    res.json({
      items: cart.items,
      total: cart.total
    });
  } catch (err) {
    console.error('Remove from cart error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.clearCart = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.items = [];
    await cart.save();
    
    res.json({ 
      message: 'Cart cleared',
      items: [],
      total: 0
    });
  } catch (err) {
    console.error('Clear cart error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};