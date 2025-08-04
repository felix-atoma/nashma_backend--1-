const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Token extraction utility function
const extractToken = (req) => {
  if (req.headers.authorization?.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.cookies?.jwt) {
    return req.cookies.jwt;
  }
  return null;
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Extract token
  const token = extractToken(req);
  
  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check user exists & active
  const currentUser = await User.findById(decoded.id).select('+active');
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401)
    );
  }

  // 4) Check account status
  if (!currentUser.active) {
    return next(
      new AppError('Your account has been deactivated. Please contact support.', 403)
    );
  }

  // 5) Check password change
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  // 6) Grant access
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // This should run after protect middleware
    if (!req.user) {
      return next(
        new AppError('You must be logged in to access this resource', 401)
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

// Enhanced token refresh middleware
exports.refreshToken = catchAsync(async (req, res, next) => {
  const refreshToken = req.cookies?.refreshToken;
  
  if (!refreshToken) {
    return next(new AppError('No refresh token provided', 401));
  }

  const decoded = await promisify(jwt.verify)(
    refreshToken,
    process.env.JWT_REFRESH_SECRET
  );

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError('User no longer exists', 401));
  }

  const newAccessToken = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  res.cookie('jwt', newAccessToken, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  });

  req.user = user;
  next();
});