
const User = require('../models/Product');

exports.getCart = async (req, res) => {
  const user = await User.findById(req.user._id).populate('cart.product');
  res.json(user.cart);
};

exports.addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  const user = await User.findById(req.user._id);

  const itemIndex = user.cart.findIndex(item => item.product.toString() === productId);
  if (itemIndex > -1) {
    user.cart[itemIndex].quantity += quantity;
  } else {
    user.cart.push({ product: productId, quantity });
  }

  await user.save();
  res.json(user.cart);
};

exports.removeFromCart = async (req, res) => {
  const user = await User.findById(req.user._id);
  user.cart = user.cart.filter(item => item.product.toString() !== req.params.productId);
  await user.save();
  res.json(user.cart);
};

exports.clearCart = async (req, res) => {
  const user = await User.findById(req.user._id);
  user.cart = [];
  await user.save();
  res.json({ message: 'Cart cleared' });
};
