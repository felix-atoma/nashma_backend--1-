const Coupon = require('../models/Coupon');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const mongoose = require('mongoose');

// Admin: Create new coupon
exports.createCoupon = catchAsync(async (req, res, next) => {
  const {
    code,
    description,
    discountType,
    discountValue,
    minPurchase,
    maxDiscount,
    validFrom,
    validUntil,
    singleUse,
    userSpecific,
    forAllUsers,
    categorySpecific,
    forAllProducts,
    usageLimit
  } = req.body;

  // Basic validation
  if (!code || !discountType || !discountValue || !validUntil) {
    return next(new AppError('Missing required coupon fields', 400));
  }

  const couponData = {
    code,
    description,
    discountType,
    discountValue,
    minPurchase,
    maxDiscount,
    validFrom: validFrom || Date.now(),
    validUntil,
    singleUse,
    userSpecific,
    forAllUsers,
    categorySpecific,
    forAllProducts,
    usageLimit,
    createdBy: req.user._id
  };

  const coupon = await Coupon.create(couponData);

  res.status(201).json({
    status: 'success',
    data: {
      coupon
    }
  });
});

// Admin: Get all coupons
exports.getAllCoupons = catchAsync(async (req, res, next) => {
  const filter = {};
  
  // Filter by active status if provided
  if (req.query.active) {
    filter.active = req.query.active === 'true';
  }

  // Filter by validity if provided
  if (req.query.valid) {
    const now = new Date();
    if (req.query.valid === 'true') {
      filter.validFrom = { $lte: now };
      filter.validUntil = { $gte: now };
    } else {
      filter.$or = [
        { validFrom: { $gt: now } },
        { validUntil: { $lt: now } }
      ];
    }
  }

  const coupons = await Coupon.find(filter).sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: coupons.length,
    data: {
      coupons
    }
  });
});

// Admin: Get single coupon
exports.getCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    return next(new AppError('Coupon not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      coupon
    }
  });
});

// Admin: Update coupon
exports.updateCoupon = catchAsync(async (req, res, next) => {
  const {
    description,
    discountValue,
    minPurchase,
    maxDiscount,
    validUntil,
    active,
    usageLimit
  } = req.body;

  const updateFields = {
    description,
    discountValue,
    minPurchase,
    maxDiscount,
    validUntil,
    active,
    usageLimit
  };

  // Remove undefined fields
  Object.keys(updateFields).forEach(
    key => updateFields[key] === undefined && delete updateFields[key]
  );

  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    updateFields,
    { new: true, runValidators: true }
  );

  if (!coupon) {
    return next(new AppError('Coupon not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      coupon
    }
  });
});

// Admin: Delete coupon
exports.deleteCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);

  if (!coupon) {
    return next(new AppError('Coupon not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// User: Validate coupon
exports.validateCoupon = catchAsync(async (req, res, next) => {
  const { code } = req.body;
  const userId = req.user._id;
  const cart = req.cart; // Assuming cart is populated via middleware

  if (!code) {
    return next(new AppError('Coupon code is required', 400));
  }

  const coupon = await Coupon.findOne({ code });

  if (!coupon) {
    return next(new AppError('Invalid coupon code', 404));
  }

  // Check basic validity
  const now = new Date();
  if (!coupon.active) {
    return next(new AppError('This coupon is no longer active', 400));
  }

  if (now < coupon.validFrom) {
    return next(new AppError('This coupon is not yet valid', 400));
  }

  if (now > coupon.validUntil) {
    return next(new AppError('This coupon has expired', 400));
  }

  if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) {
    return next(new AppError('This coupon has reached its usage limit', 400));
  }

  // Check user-specific restrictions
  if (!coupon.forAllUsers) {
    if (!coupon.userSpecific.includes(userId)) {
      return next(new AppError('This coupon is not valid for your account', 403));
    }
  }

  // Check minimum purchase requirement
  if (cart.subtotal < coupon.minPurchase) {
    return next(new AppError(
      `Minimum purchase of ${coupon.minPurchase} required for this coupon`,
      400
    ));
  }

  // Check product restrictions
  if (!coupon.forAllProducts) {
    const productCategories = await Product.distinct('category', { 
      _id: { $in: cart.items.map(item => item.product) } 
    });

    const validCategory = productCategories.some(cat => 
      coupon.categorySpecific.includes(cat)
    );

    if (!validCategory) {
      return next(new AppError(
        'This coupon is not valid for products in your cart',
        400
      ));
    }
  }

  // Calculate discount
  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = cart.subtotal * (coupon.discountValue / 100);
    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    discount = Math.min(coupon.discountValue, cart.subtotal);
  }

  res.status(200).json({
    status: 'success',
    data: {
      valid: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount
      },
      discount,
      discountedTotal: cart.subtotal - discount
    }
  });
});

// Middleware to record coupon usage
exports.recordCouponUsage = catchAsync(async (req, res, next) => {
  if (!req.body.couponCode) return next();

  const coupon = await Coupon.findOneAndUpdate(
    { code: req.body.couponCode },
    { $inc: { timesUsed: 1 } },
    { new: true }
  );

  if (!coupon) {
    return next(new AppError('Coupon not found', 404));
  }

  next();
});