const Cart = require('../models/Cart');
const Product = require('../models/Product');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

/**
 * Get the current user's cart with populated product details
 */
exports.getCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id })
    .populate({
      path: 'items.product',
      select: 'name price images stock status',
      match: { status: 'active' } // Only include active products
    });

  // Filter out any products that may have been deactivated
  const validItems = cart?.items.filter(item => item.product) || [];
  
  res.status(200).json({
    status: 'success',
    data: {
      items: validItems,
      subtotal: cart?.subtotal || 0,
      itemCount: validItems.reduce((sum, item) => sum + item.quantity, 0)
    }
  });
});

/**
 * Add or update an item in the cart
 */
exports.addToCart = catchAsync(async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;
  const qty = Math.max(1, Math.min(100, Math.round(Number(quantity))));

  if (!productId) {
    return next(new AppError('Product ID is required', 400));
  }

  // Verify product exists and is available
  const product = await Product.findOne({
  _id: productId,
  status: 'active',
  stock: { $gte: qty }
});

if (!product) {
  return res.status(404).json({
    status: 'fail',
    message: 'Product not found or out of stock'
  });
}


  if (!product) {
    return next(new AppError('Product not available or insufficient stock', 404));
  }

  // Find or create cart with optimistic concurrency control
  let cart = await Cart.findOne({ user: req.user._id });
  
  if (!cart) {
    cart = new Cart({ 
      user: req.user._id,
      items: []
    });
  }

  // Check if product already in cart
  const existingItemIndex = cart.items.findIndex(i => 
    i.product.equals(productId)
  );

  if (existingItemIndex > -1) {
    // Update existing item
    const newQuantity = cart.items[existingItemIndex].quantity + qty;
    
    if (newQuantity > 100) {
      return next(new AppError('Total quantity cannot exceed 100 per product', 400));
    }
    
    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    // Add new item
    cart.items.push({
      product: productId,
      quantity: qty,
      priceAtAddition: product.price
    });
  }

  await cart.save();
  await cart.populate('items.product', 'name price images');

  res.status(200).json({
    status: 'success',
    data: {
      items: cart.items,
      subtotal: cart.subtotal,
      itemCount: cart.itemCount
    }
  });
});

/**
 * Remove an item from the cart
 */
exports.removeFromCart = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    { $pull: { items: { product: productId } } },
    { new: true }
  ).populate('items.product', 'name price images');

  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      items: cart.items,
      subtotal: cart.subtotal,
      itemCount: cart.itemCount
    }
  });
});

/**
 * Clear all items from the cart
 */
exports.clearCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    { items: [], subtotal: 0 },
    { new: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      items: [],
      subtotal: 0,
      itemCount: 0
    }
  });
});

/**
 * Update item quantities in bulk
 */
exports.updateCart = catchAsync(async (req, res, next) => {
  const updates = req.body.items; // Expects array of { productId, quantity }
  
  if (!Array.isArray(updates)) {
    return next(new AppError('Invalid update format', 400));
  }

  // Validate all quantities first
 for (const item of updates) {
  if (!item.productId || isNaN(item.quantity)) {
    return next(new AppError('Invalid item data', 400));
  }
  if (item.quantity < 0 || item.quantity > 100) {
    return next(new AppError('Quantity must be between 0 and 100', 400));
  }
}


  // Get current cart
  let cart = await Cart.findOne({ user: req.user._id });
  
  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  // Process updates
  updates.forEach(update => {
    const index = cart.items.findIndex(i => 
      i.product.equals(update.productId)
    );
    
    if (index !== -1) {
      if (update.quantity === 0) {
        // Remove item if quantity is 0
        cart.items.splice(index, 1);
      } else {
        // Update quantity
        cart.items[index].quantity = update.quantity;
      }
    }
  });

  await cart.save();
  await cart.populate('items.product', 'name price images');

  res.status(200).json({
    status: 'success',
    data: {
      items: cart.items,
      subtotal: cart.subtotal,
      itemCount: cart.itemCount
    }
  });
});