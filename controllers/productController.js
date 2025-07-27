const Product = require('../models/Product');
const Cart = require('../models/Cart'); // You'll need a Cart model

// Product-related controllers
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Cart-related controllers
exports.getCart = async (req, res) => {
  try {
    // In a real app, you'd get the user's cart based on their session/auth
    const cart = await Cart.findOne({ userId: req.user._id }).populate('items.product');
    res.status(200).json(cart || { items: [], total: 0 });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    // 1. Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // 2. Find or create the user's cart
    let cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart) {
      cart = new Cart({ userId: req.user._id, items: [] });
    }

    // 3. Check if product already exists in cart
    const existingItem = cart.items.find(item => item.product.equals(productId));
    
    if (existingItem) {
      existingItem.quantity += quantity || 1;
    } else {
      cart.items.push({ product: productId, quantity: quantity || 1 });
    }

    // 4. Recalculate total
    cart.total = cart.items.reduce((sum, item) => {
      return sum + (product.price * item.quantity);
    }, 0);

    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => !item.product.equals(productId));
    
    // Recalculate total
    const products = await Product.find({ _id: { $in: cart.items.map(i => i.product) } });
    cart.total = cart.items.reduce((sum, item) => {
      const product = products.find(p => p._id.equals(item.product));
      return sum + (product.price * item.quantity);
    }, 0);

    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { items: [], total: 0 } },
      { new: true }
    );
    res.status(200).json({ message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};