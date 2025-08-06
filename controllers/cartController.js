const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const mongoose = require('mongoose');

// Utility function for logging cart operations
const logCartOperation = (operation, data) => {
  console.log(`🛒 [${operation.toUpperCase()}]`, {
    timestamp: new Date().toISOString(),
    ...data
  });
};

// Helper function to handle transactions
// Improved transaction handler with better error reporting and timeout
const withTransaction = async (operation, session, maxRetries = 2, timeoutMs = 5000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Set transaction options with timeout
      const transactionOptions = {
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority' },
        maxTimeMS: timeoutMs
      };

      session.startTransaction(transactionOptions);
      
      // Use Promise.race to add timeout protection
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), timeoutMs)
        )
      ]);
      
      await session.commitTransaction();
      return result;
    } catch (err) {
      await session.abortTransaction();
      lastError = err;
      
      console.warn(`Transaction attempt ${attempt} failed:`, err.message);
      
      // Only retry on specific errors
      if (err.code === 11000 || // Duplicate key
          err.message.includes('Transaction') || 
          err.message.includes('write conflict') ||
          err.message.includes('timeout') ||
          err.errorLabels?.includes('TransientTransactionError')) {
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
          continue;
        }
      }
      
      // Don't retry for other errors
      break;
    }
  }
  
  console.error(`Transaction failed after ${maxRetries} attempts`, lastError?.message);
  throw new AppError('Database operation failed. Please try again.', 409);
};

// Get user's cart with full details
exports.getCart = catchAsync(async (req, res, next) => {
  // Check if user is authenticated
  if (!req.user || !req.user._id) {
    return next(new AppError('Authentication required', 401));
  }

  const cart = await Cart.findOne({ user: req.user._id })
    .populate({
      path: 'coupon',
      select: 'code discountType discountValue validFrom validUntil'
    });

  if (!cart) {
    return res.status(200).json({
      status: 'success',
      data: {
        cart: {
          items: [],
          subtotal: 0,
          itemCount: 0,
          discount: 0,
          total: 0
        }
      }
    });
  }

  // Calculate discount if coupon exists and is valid
  let discount = 0;
  if (cart.coupon && new Date(cart.coupon.validUntil) > new Date()) {
    if (cart.coupon.discountType === 'percentage') {
      discount = cart.subtotal * (cart.coupon.discountValue / 100);
    } else {
      discount = Math.min(cart.coupon.discountValue, cart.subtotal);
    }
  }

  res.status(200).json({
    status: 'success',
    data: {
      cart: {
        id: cart._id,
        items: cart.items,
        subtotal: cart.subtotal,
        itemCount: cart.itemCount,
        discount,
        total: Math.max(0, cart.subtotal - discount),
        coupon: cart.coupon || null,
        updatedAt: cart.updatedAt
      }
    }
  });
});

// Add item to cart with comprehensive validation
exports.addToCart = catchAsync(async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;

  // Check if user is authenticated
  if (!req.user || !req.user._id) {
    return next(new AppError('Authentication required', 401));
  }

  // Debug logging
  console.log('User ID:', req.user._id);

  // Input validation
  if (!productId) {
    return next(new AppError('Product ID is required', 400));
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return next(new AppError('Invalid product ID format', 400));
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return next(new AppError('Quantity must be an integer between 1 and 100', 400));
  }

  // Simplified approach without complex transactions
  try {
    // First, check if product exists and has enough stock
    const product = await Product.findOne({
      _id: productId,
      status: 'active'
    }).select('name price countInStock');

    if (!product) {
      return next(new AppError('Product not found or not available', 404));
    }

    if (product.countInStock < quantity) {
      return next(new AppError(`Only ${product.countInStock} items available in stock`, 400));
    }

    // Aggressive cart cleanup and creation
    console.log('Checking existing carts for user:', req.user._id);
    
    // First, clean up any problematic carts for this user
    try {
      await Cart.deleteMany({
        $or: [
          { user: null },
          { userId: null },
          { userId: { $exists: true } }, // Remove old schema documents
          { user: req.user._id, items: { $exists: false } } // Remove corrupted carts
        ]
      });
      console.log('Cleaned up problematic carts');
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    // Now try to find or create cart
    let cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      // If still no cart, force create a new one
      try {
        // Create without save first to check for issues
        cart = new Cart({
          user: req.user._id,
          items: []
        });
        
        // Validate the cart before saving
        const validationError = cart.validateSync();
        if (validationError) {
          console.error('Cart validation error:', validationError);
          return next(new AppError('Cart validation failed', 500));
        }
        
        await cart.save();
        console.log('Successfully created new cart:', cart._id);
        
      } catch (createError) {
        console.error('Cart creation failed:', createError);
        
        // Last resort - try to find any existing cart again
        cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
          return next(new AppError('Unable to create cart. Please contact support.', 500));
        }
        console.log('Found existing cart after error:', cart._id);
      }
    } else {
      console.log('Found existing cart:', cart._id);
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update existing item quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      // Check if total quantity exceeds stock
      if (newQuantity > product.countInStock) {
        return next(new AppError(
          `Cannot add ${quantity} items. Only ${product.countInStock - cart.items[existingItemIndex].quantity} more available`, 
          400
        ));
      }
      
      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item to cart
      cart.items.push({
        product: productId,
        quantity: quantity,
        priceAtAddition: product.price,
        addedAt: new Date()
      });
    }

    // Save cart first
    await cart.save();

    // Update product stock
    await Product.findByIdAndUpdate(
      productId,
      { $inc: { countInStock: -quantity } }
    );

    // Get updated cart with populated data (but without the pre middleware)
    const updatedCart = await Cart.findById(cart._id)
      .populate({
        path: 'items.product',
        select: 'name price image countInStock status slug'
      });

    logCartOperation('ADD_ITEM', {
      userId: req.user._id,
      productId,
      quantity,
      cartId: cart._id
    });

    // Success response
    res.status(200).json({
      status: 'success',
      data: { 
        cart: {
          id: updatedCart._id,
          items: updatedCart.items,
          subtotal: updatedCart.subtotal,
          itemCount: updatedCart.itemCount,
          updatedAt: updatedCart.updatedAt
        }
      }
    });

  } catch (err) {
    console.error('Cart operation failed:', err);
    
    // Don't call next() if response was already sent
    if (!res.headersSent) {
      if (err instanceof AppError) {
        return next(err);
      }
      next(new AppError('An error occurred while updating your cart', 500));
    }
  }
});

// Remove item from cart
exports.removeFromCart = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  // Check if user is authenticated
  if (!req.user || !req.user._id) {
    return next(new AppError('Authentication required', 401));
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return next(new AppError('Invalid product ID format', 400));
  }

  const session = await mongoose.startSession();

  try {
    await withTransaction(async () => {
      const cart = await Cart.findOne({ user: req.user._id }).session(session);
      
      if (!cart) {
        throw new AppError('Cart not found', 404);
      }

      const itemIndex = cart.items.findIndex(
        item => item.product.toString() === productId
      );

      if (itemIndex === -1) {
        throw new AppError('Item not found in cart', 404);
      }

      const removedItem = cart.items[itemIndex];
      cart.items.splice(itemIndex, 1);

      // Restore product stock
      await Product.findByIdAndUpdate(
        productId,
        { $inc: { countInStock: removedItem.quantity } },
        { session }
      );

      await cart.save({ session });
    }, session);

    logCartOperation('REMOVE_ITEM', {
      userId: req.user._id,
      productId
    });

    res.status(204).json({
      status: 'success',
      data: null
    });

  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }
    next(new AppError('An error occurred while removing item from cart', 500));
  } finally {
    session.endSession();
  }
});

// Update cart item quantities
exports.updateCartItems = catchAsync(async (req, res, next) => {
  const { items } = req.body;

  // Check if user is authenticated
  if (!req.user || !req.user._id) {
    return next(new AppError('Authentication required', 401));
  }

  if (!Array.isArray(items)) {
    return next(new AppError('Items must be provided as an array', 400));
  }

  const session = await mongoose.startSession();

  try {
    const updatedCart = await withTransaction(async () => {
      const cart = await Cart.findOne({ user: req.user._id }).session(session);
      
      if (!cart) {
        throw new AppError('Cart not found', 404);
      }

      // Verify all products first
      const productIds = items.map(item => item.productId);
      const products = await Product.find({
        _id: { $in: productIds },
        status: 'active'
      }).session(session);

      if (products.length !== items.length) {
        throw new AppError('One or more products not found or unavailable', 404);
      }

      // Process updates
      const productUpdates = [];
      const updatedItems = [...cart.items];

      for (const update of items) {
        if (!mongoose.Types.ObjectId.isValid(update.productId)) {
          throw new AppError('Invalid product ID format', 400);
        }

        if (!Number.isInteger(update.quantity) || update.quantity < 0 || update.quantity > 100) {
          throw new AppError('Quantity must be an integer between 0 and 100', 400);
        }

        const itemIndex = updatedItems.findIndex(
          item => item.product.toString() === update.productId
        );

        if (itemIndex === -1) {
          throw new AppError(`Product ${update.productId} not found in cart`, 404);
        }

        if (update.quantity === 0) {
          // Remove item if quantity is 0
          const removedItem = updatedItems.splice(itemIndex, 1)[0];
          productUpdates.push({
            updateOne: {
              filter: { _id: update.productId },
              update: { $inc: { countInStock: removedItem.quantity } }
            }
          });
        } else {
          // Update quantity
          const quantityDiff = update.quantity - updatedItems[itemIndex].quantity;
          updatedItems[itemIndex].quantity = update.quantity;
          
          if (quantityDiff !== 0) {
            productUpdates.push({
              updateOne: {
                filter: { _id: update.productId },
                update: { $inc: { countInStock: -quantityDiff } }
              }
            });
          }
        }
      }

      // Apply all product stock updates
      if (productUpdates.length > 0) {
        await Product.bulkWrite(productUpdates, { session });
      }

      // Update cart
      const updatedCart = await Cart.findOneAndUpdate(
        { _id: cart._id },
        { $set: { items: updatedItems } },
        { new: true, session }
      ).populate('items.product');

      return updatedCart;
    }, session);

    logCartOperation('UPDATE_ITEMS', {
      userId: req.user._id,
      itemsCount: items.length
    });

    res.status(200).json({
      status: 'success',
      data: {
        cart: {
          id: updatedCart._id,
          items: updatedCart.items,
          subtotal: updatedCart.subtotal,
          itemCount: updatedCart.itemCount,
          updatedAt: updatedCart.updatedAt
        }
      }
    });

  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }
    next(new AppError('An error occurred while updating cart items', 500));
  } finally {
    session.endSession();
  }
});

// Clear entire cart
exports.clearCart = catchAsync(async (req, res, next) => {
  // Check if user is authenticated
  if (!req.user || !req.user._id) {
    return next(new AppError('Authentication required', 401));
  }

  const session = await mongoose.startSession();

  try {
    await withTransaction(async () => {
      const cart = await Cart.findOne({ user: req.user._id }).session(session);
      
      if (!cart) {
        throw new AppError('Cart not found', 404);
      }

      if (cart.items.length === 0) {
        return; // No need to proceed if cart is already empty
      }

      // Restore all product stock
      const bulkOps = cart.items.map(item => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { countInStock: item.quantity } }
        }
      }));

      await Product.bulkWrite(bulkOps, { session });

      // Clear cart items
      cart.items = [];
      await cart.save({ session });
    }, session);

    logCartOperation('CLEAR_CART', {
      userId: req.user._id
    });

    res.status(204).json({
      status: 'success',
      data: null
    });

  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }
    next(new AppError('An error occurred while clearing the cart', 500));
  } finally {
    session.endSession();
  }
});

// Apply coupon to cart
exports.applyCoupon = catchAsync(async (req, res, next) => {
  const { couponCode } = req.body;

  // Check if user is authenticated
  if (!req.user || !req.user._id) {
    return next(new AppError('Authentication required', 401));
  }

  if (!couponCode) {
    return next(new AppError('Coupon code is required', 400));
  }

  const session = await mongoose.startSession();

  try {
    const cart = await withTransaction(async () => {
      const coupon = await Coupon.findOne({
        code: couponCode,
        active: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() }
      }).session(session);

      if (!coupon) {
        throw new AppError('Invalid or expired coupon', 400);
      }

      // Get cart with current subtotal
      const cart = await Cart.findOne({ user: req.user._id })
        .session(session)
        .populate('items.product');

      if (!cart) {
        throw new AppError('Cart not found', 404);
      }

      // Check minimum purchase requirement
      if (coupon.minPurchase && cart.subtotal < coupon.minPurchase) {
        throw new AppError(
          `Minimum purchase of ${coupon.minPurchase} required for this coupon`,
          400
        );
      }

      // Apply coupon
      const updatedCart = await Cart.findOneAndUpdate(
        { _id: cart._id },
        { coupon: coupon._id },
        { new: true, session }
      ).populate(['items.product', 'coupon']);

      return updatedCart;
    }, session);

    // Calculate discount
    let discount = 0;
    if (cart.coupon.discountType === 'percentage') {
      discount = cart.subtotal * (cart.coupon.discountValue / 100);
      if (cart.coupon.maxDiscount) {
        discount = Math.min(discount, cart.coupon.maxDiscount);
      }
    } else {
      discount = Math.min(cart.coupon.discountValue, cart.subtotal);
    }

    logCartOperation('APPLY_COUPON', {
      userId: req.user._id,
      couponCode,
      discount
    });

    res.status(200).json({
      status: 'success',
      data: {
        cart: {
          id: cart._id,
          items: cart.items,
          subtotal: cart.subtotal,
          itemCount: cart.itemCount,
          discount,
          total: Math.max(0, cart.subtotal - discount),
          coupon: cart.coupon,
          updatedAt: cart.updatedAt
        }
      }
    });

  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }
    next(new AppError('An error occurred while applying coupon', 500));
  } finally {
    session.endSession();
  }
});

// Remove coupon from cart
exports.removeCoupon = catchAsync(async (req, res, next) => {
  // Check if user is authenticated
  if (!req.user || !req.user._id) {
    return next(new AppError('Authentication required', 401));
  }

  const session = await mongoose.startSession();

  try {
    const cart = await withTransaction(async () => {
      const cart = await Cart.findOne({ user: req.user._id })
        .session(session)
        .populate('items.product');

      if (!cart) {
        throw new AppError('Cart not found', 404);
      }

      if (!cart.coupon) {
        return cart; // No coupon to remove
      }

      const updatedCart = await Cart.findOneAndUpdate(
        { _id: cart._id },
        { $unset: { coupon: "" } },
        { new: true, session }
      ).populate('items.product');

      return updatedCart;
    }, session);

    logCartOperation('REMOVE_COUPON', {
      userId: req.user._id
    });

    res.status(200).json({
      status: 'success',
      data: {
        cart: {
          id: cart._id,
          items: cart.items,
          subtotal: cart.subtotal,
          itemCount: cart.itemCount,
          discount: 0,
          total: cart.subtotal,
          coupon: null,
          updatedAt: cart.updatedAt
        }
      }
    });

  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }
    next(new AppError('An error occurred while removing coupon', 500));
  } finally {
    session.endSession();
  }
});