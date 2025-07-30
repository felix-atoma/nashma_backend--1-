const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: [true, 'Product ID is required'],
    immutable: true
  },
  quantity: { 
    type: Number, 
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    max: [100, 'Quantity cannot exceed 100'],
    set: v => Math.round(v) // Ensure whole numbers
  },
  priceAtAddition: { // Store price at time of addition
    type: Number,
    required: true
  }
}, { _id: false, timestamps: true });

const cartSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'User ID is required'],
    unique: true,
    immutable: true
  },
  items: {
    type: [cartItemSchema],
    default: [],
    validate: {
      validator: items => {
        const productIds = items.map(i => i.product.toString());
        return new Set(productIds).size === productIds.length;
      },
      message: 'Duplicate products in cart'
    }
  },
  subtotal: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Calculate subtotal before saving
cartSchema.pre('save', function(next) {
  this.subtotal = this.items.reduce(
    (sum, item) => sum + (item.quantity * item.priceAtAddition),
    0
  );
  this.updatedAt = Date.now();
  next();
});

// Add virtual for item count
cartSchema.virtual('itemCount').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

module.exports = mongoose.model('Cart', cartSchema);