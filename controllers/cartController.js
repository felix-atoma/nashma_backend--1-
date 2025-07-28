const Cart = require('../models/Cart');

exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne().populate('items.product');
    if (!cart) return res.json({ items: [] });
    res.json(cart.items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  let cart = await Cart.findOne();

  if (!cart) cart = new Cart({ items: [] });

  const index = cart.items.findIndex(item => item.product.toString() === productId);
  if (index > -1) {
    cart.items[index].quantity += quantity;
  } else {
    cart.items.push({ product: productId, quantity });
  }

  await cart.save();
  res.json(cart.items);
};

exports.removeFromCart = async (req, res) => {
  const cart = await Cart.findOne();
  if (!cart) return res.status(404).json({ message: 'Cart not found' });

  cart.items = cart.items.filter(item => item.product.toString() !== req.params.productId);
  await cart.save();
  res.json(cart.items);
};

exports.clearCart = async (req, res) => {
  const cart = await Cart.findOne();
  if (!cart) return res.status(404).json({ message: 'Cart not found' });

  cart.items = [];
  await cart.save();
  res.json({ message: 'Cart cleared' });
};
