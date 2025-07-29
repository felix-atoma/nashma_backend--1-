const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: [true, 'Product ID is required'],
    validate: {
      validator: async function(productId) {
        const product = await mongoose.model('Product').findById(productId);
        return product !== null;
      },
      message: 'Product does not exist'
    }
  },
  quantity: { 
    type: Number, 
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    max: [100, 'Quantity cannot exceed 100'] 
  }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'User ID is required'],
    unique: true
  },
  items: {
    type: [cartItemSchema],
    validate: {
      validator: function(items) {
        const productIds = items.map(item => item.product.toString());
        return new Set(productIds).size === productIds.length;
      },
      message: 'Duplicate products in cart'
    }
  },
  total: { 
    type: Number, 
    default: 0,
    min: 0 
  }
}, { timestamps: true });

// Calculate total before saving
cartSchema.pre('save', async function(next) {
  if (this.isModified('items')) {
    const populatedCart = await this.populate('items.product');
    this.total = populatedCart.items.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);
  }
  next();
});

module.exports = mongoose.model('Cart', cartSchema);