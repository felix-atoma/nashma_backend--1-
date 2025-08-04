// controllers/authController.js
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/email');

// ============================================
// 🗝️  AUTHENTICATION UTILITIES
// ============================================

const signToken = (id, expiresIn = process.env.JWT_EXPIRES_IN) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() +
        process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    sameSite: 'Strict',
  };

  res.cookie('jwt', token, cookieOptions);

  // Strip sensitive fields
  user.password = undefined;
  user.passwordConfirm = undefined;
  user.active = undefined;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user },
  });
};

// ============================================
// 🔒  AUTHENTICATION MIDDLEWARE
// ============================================

exports.protect = catchAsync(async (req, res, next) => {
  try {
    // 1) Get token
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );
    }

    // 2) Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists (no .lean() so virtuals like .id are available)
    const currentUser = await User.findById(decoded.id)
      .select('+passwordChangedAt +active')
      .maxTimeMS(5000);

    if (!currentUser) {
      return next(
        new AppError('The user belonging to this token no longer exists.', 401)
      );
    }

    // 4) Password changed after token issued?
    if (
      currentUser.passwordChangedAt &&
      new Date(currentUser.passwordChangedAt).getTime() / 1000 > decoded.iat
    ) {
      return next(
        new AppError('User recently changed password! Please log in again.', 401)
      );
    }

    // 5) Active?
    if (currentUser.active === false) {
      return next(
        new AppError('Your account has been deactivated. Please contact support.', 403)
      );
    }

    // Grant access
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired. Please log in again.', 401));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    return next(new AppError('Authentication failed.', 401));
  }
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

// ============================================
// 🚪  AUTHENTICATION CONTROLLERS
// ============================================

exports.signup = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, password, passwordConfirm, role } =
    req.body;

  const requiredFields = [
    'firstName',
    'lastName',
    'email',
    'password',
    'passwordConfirm',
  ];
  const missingFields = requiredFields.filter((f) => !req.body[f]);
  if (missingFields.length > 0) {
    return next(
      new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400)
    );
  }

  if (password !== passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  const existingUser = await User.findOne({ email }).lean().maxTimeMS(5000);
  if (existingUser) {
    return next(new AppError('Email already in use', 400));
  }

  const newUser = await User.create({
    firstName,
    lastName,
    email,
    password,
    passwordConfirm,
    role: role || 'user',
  });

  setImmediate(async () => {
    try {
      const welcomeURL = `${req.protocol}://${req.get('host')}/me`;
      await new Email(newUser, welcomeURL).sendWelcome();
    } catch (err) {
      console.error('Error sending welcome email:', err);
    }
  });

  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email })
    .select('+password +active')
    .maxTimeMS(5000);
  if (!user) {
    return next(new AppError('Incorrect email or password', 401));
  }

  if (!(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  if (user.active === false) {
    return next(new AppError('Account deactivated. Contact support.', 403));
  }

  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

// ============================================
// 🔄  PASSWORD MANAGEMENT
// ============================================

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email }).maxTimeMS(5000);
  if (!user) {
    return next(
      new AppError('There is no user with that email address.', 404)
    );
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/auth/reset-password/${resetToken}`;
  setImmediate(async () => {
    try {
      await new Email(user, resetURL).sendPasswordReset();
    } catch (err) {
      console.error('Error sending password reset email:', err);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Token sent to email!',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).maxTimeMS(5000);

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  const { password, passwordConfirm } = req.body;
  if (!password || !passwordConfirm) {
    return next(
      new AppError('Please provide and confirm new password', 400)
    );
  }
  if (password !== passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = new Date();

  await user.save();

  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .select('+password')
    .maxTimeMS(5000);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  if (req.body.newPassword !== req.body.passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordChangedAt = new Date();
  await user.save();

  createSendToken(user, 200, req, res);
});

// ============================================
// 👑  ADMIN MANAGEMENT
// ============================================

exports.createAdmin = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, password, passwordConfirm } = req.body;

  const requiredFields = [
    'firstName',
    'lastName',
    'email',
    'password',
    'passwordConfirm',
  ];
  const missingFields = requiredFields.filter((f) => !req.body[f]);
  if (missingFields.length > 0) {
    return next(
      new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400)
    );
  }

  if (password !== passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  const existingUser = await User.findOne({ email }).lean().maxTimeMS(5000);
  if (existingUser) {
    return next(new AppError('Email already in use', 400));
  }

  const newAdmin = await User.create({
    firstName,
    lastName,
    email,
    password,
    passwordConfirm,
    role: 'admin',
  });

  setImmediate(async () => {
    try {
      const adminDashboardURL = `${req.protocol}://${req.get('host')}/admin/dashboard`;
      await new Email(newAdmin, adminDashboardURL).sendAdminWelcome();
    } catch (err) {
      console.error('Error sending admin welcome email:', err);
    }
  });

  createSendToken(newAdmin, 201, req, res);
});

exports.setAdminRole = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { role: 'admin' },
    { new: true, runValidators: true }
  ).maxTimeMS(5000);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  setImmediate(async () => {
    try {
      const adminDashboardURL = `${req.protocol}://${req.get('host')}/admin/dashboard`;
      await new Email(user, adminDashboardURL).sendRoleUpdateNotification(
        'admin'
      );
    } catch (err) {
      console.error('Error sending role update email:', err);
    }
  });

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

exports.removeAdminRole = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { role: 'user' },
    { new: true, runValidators: true }
  ).maxTimeMS(5000);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  setImmediate(async () => {
    try {
      const userDashboardURL = `${req.protocol}://${req.get('host')}/dashboard`;
      await new Email(user, userDashboardURL).sendRoleUpdateNotification('user');
    } catch (err) {
      console.error('Error sending role update email:', err);
    }
  });

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

// ============================================
// 🔄  TOKEN MANAGEMENT
// ============================================

exports.refreshToken = catchAsync(async (req, res, next) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return next(new AppError('No refresh token provided', 401));
  }

  try {
    const decoded = await promisify(jwt.verify)(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const user = await User.findById(decoded.id).lean().maxTimeMS(5000);
    if (!user) {
      return next(new AppError('User no longer exists', 401));
    }

    const newToken = signToken(user._id);
    res.cookie('jwt', newToken, {
      expires: new Date(
        Date.now() +
          process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
      sameSite: 'Strict',
    });

    res.status(200).json({
      status: 'success',
      token: newToken,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token refresh expired. Please re-login.', 401));
    }
    return next(new AppError('Token refresh failed', 401));
  }
});

// ============================================
// 👤  USER MANAGEMENT
// ============================================

exports.getMe = catchAsync(async (req, res, next) => {
  const user = req.user;
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

exports.deactivateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { active: false },
    { new: true }
  ).maxTimeMS(5000);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: null,
    message: 'User account deactivated successfully',
  });
});

exports.activateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { active: true },
    { new: true }
  ).maxTimeMS(5000);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: null,
    message: 'User account activated successfully',
  });
});
