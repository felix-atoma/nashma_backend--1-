const mongoose = require('mongoose');
const validator = require('validator');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'A cart item must reference a product'],
    immutable: true,
    validate: {
      validator: function(v) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid product ID'
    }
  },
  quantity: {
    type: Number,
    required: [true, 'A cart item must have a quantity'],
    min: [1, 'Quantity cannot be less than 1'],
    max: [100, 'Quantity cannot exceed 100'],
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be an integer'
    }
  },
  priceAtAddition: {
    type: Number,
    required: [true, 'Price at time of addition must be recorded'],
    min: [0, 'Price cannot be negative']
  },
  addedAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A cart must belong to a user'],
    unique: true,
    immutable: true
  },
  items: {
    type: [cartItemSchema],
    default: [],
    validate: {
      validator: function(items) {
        const productIds = items.map(item => item.product.toString());
        return new Set(productIds).size === productIds.length;
      },
      message: 'Duplicate products in cart'
    }
  },
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    validate: {
      validator: function(v) {
        if (!v) return true;
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid coupon ID'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual properties
cartSchema.virtual('subtotal').get(function() {
  return this.items.reduce((sum, item) => {
    return sum + (item.priceAtAddition * item.quantity);
  }, 0);
});

cartSchema.virtual('itemCount').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Indexes
cartSchema.index({ user: 1 }, { unique: true });
cartSchema.index({ 'items.product': 1 });
cartSchema.index({ updatedAt: 1 });

// Pre-save hooks
cartSchema.pre('save', function(next) {
  // Sort items by most recently added
  if (this.isModified('items')) {
    this.items.sort((a, b) => b.addedAt - a.addedAt);
  }
  next();
});

// Query middleware to always populate basic product info
cartSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'items.product',
    select: 'name price image countInStock status slug'
  });
  next();
});

module.exports = mongoose.model('Cart', cartSchema);