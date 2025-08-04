// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (val) {
          // Basic email regex; you can substitute a more robust one if desired
          return /^\S+@\S+\.\S+$/.test(val);
        },
        message: 'Please provide a valid email',
      },
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never return in queries by default
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual field for password confirmation (not persisted)
userSchema
  .virtual('passwordConfirm')
  .get(function () {
    return this._passwordConfirm;
  })
  .set(function (val) {
    this._passwordConfirm = val;
  });

// Validate that password and confirm match before save
userSchema.pre('validate', function (next) {
  if (this.isModified('password')) {
    if (!this._passwordConfirm) {
      this.invalidate('passwordConfirm', 'Please confirm your password');
    }
    if (this.password !== this._passwordConfirm) {
      this.invalidate('passwordConfirm', 'Passwords do not match');
    }
  }
  next();
});

// Hash password if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const SALT_ROUNDS = 10; // adjust if needed for performance/security balance
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);

  // Clean up confirm (not persisted anyway)
  this._passwordConfirm = undefined;
  next();
});

// Instance method to check password correctness
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to check if password changed after token issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTime = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTime;
  }
  return false;
};

// Instance method to create password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Expires in 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken; // unhashed token to send via email
};

// Optional: filter inactive users in queries if desired
userSchema.pre(/^find/, function (next) {
  // this points to query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);
