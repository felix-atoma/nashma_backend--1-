const jwt = require('jsonwebtoken');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// ==================== HELPER FUNCTIONS ====================
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d',
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// ==================== AUTH CONTROLLERS ====================

// 1. SIGNUP
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  createSendToken(newUser, 201, res);
});

// 2. LOGIN
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  createSendToken(user, 200, res);
});

// 3. PROTECT (Middleware for authenticated users)
exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  req.user = currentUser;
  next();
});

// 4. RESTRICT TO (Role-based access control)
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// 5. FORGOT PASSWORD (Placeholder)
exports.forgotPassword = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    message: 'Password reset token sent to email! (To be implemented)',
  });
});

// 6. RESET PASSWORD (Placeholder)
exports.resetPassword = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    message: 'Password reset successful! (To be implemented)',
  });
});

// 7. UPDATE PASSWORD (Logged-in user)
exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Your current password is incorrect.', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  createSendToken(user, 200, res);
});

// 8. CREATE ADMIN (Admin-only)
exports.createAdmin = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  const adminUser = await User.create({
    name,
    email,
    password,
    role: 'admin',
  });

  res.status(201).json({
    status: 'success',
    data: {
      user: adminUser,
    },
  });
});

// 9. SET ADMIN ROLE (Super Admin-only)
exports.setAdminRole = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { role: 'admin' },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('No user found with that ID.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});