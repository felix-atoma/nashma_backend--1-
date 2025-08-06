const mongoose = require('mongoose');
const validator = require('validator');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return validator.isAlphanumeric(v.replace(/[-_]/g, ''));
      },
      message: 'Coupon code can only contain letters, numbers, hyphens, and underscores'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  discountType: {
    type: String,
    required: [true, 'Discount type is required'],
    enum: {
      values: ['percentage', 'fixed'],
      message: 'Discount type must be either "percentage" or "fixed"'
    }
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative']
  },
  minPurchase: {
    type: Number,
    min: [0, 'Minimum purchase cannot be negative'],
    default: 0
  },
  maxDiscount: {
    type: Number,
    min: [0, 'Maximum discount cannot be negative'],
    validate: {
      validator: function(v) {
        if (this.discountType === 'percentage') return true;
        return v === undefined || v === null;
      },
      message: 'Max discount only applies to percentage discounts'
    }
  },
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required'],
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required'],
    validate: {
      validator: function(v) {
        return v > this.validFrom;
      },
      message: 'Valid until must be after valid from'
    }
  },
  active: {
    type: Boolean,
    default: true
  },
  singleUse: {
    type: Boolean,
    default: false
  },
  userSpecific: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    validate: {
      validator: function(v) {
        return !this.forAllUsers || v.length === 0;
      },
      message: 'Cannot specify users when coupon is for all users'
    }
  },
  forAllUsers: {
    type: Boolean,
    default: false
  },
  categorySpecific: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Category',
    validate: {
      validator: function(v) {
        return !this.forAllProducts || v.length === 0;
      },
      message: 'Cannot specify categories when coupon is for all products'
    }
  },
  forAllProducts: {
    type: Boolean,
    default: true
  },
  usageLimit: {
    type: Number,
    min: [1, 'Usage limit must be at least 1'],
    default: null
  },
  timesUsed: {
    type: Number,
    default: 0,
    min: [0, 'Times used cannot be negative']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Validate discount value based on type
couponSchema.pre('save', function(next) {
  if (this.discountType === 'percentage' && this.discountValue > 100) {
    throw new Error('Percentage discount cannot exceed 100%');
  }
  next();
});

// Indexes
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ validFrom: 1, validUntil: 1 });
couponSchema.index({ active: 1 });

// Virtual for checking if coupon is currently valid
couponSchema.virtual('isValid').get(function() {
  const now = Date.now();
  return this.active && 
         now >= this.validFrom && 
         now <= this.validUntil &&
         (!this.usageLimit || this.timesUsed < this.usageLimit);
});

module.exports = mongoose.model('Coupon', couponSchema);