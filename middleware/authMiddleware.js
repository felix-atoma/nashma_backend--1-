// middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.protect = catchAsync(async (req, res, next) => {
   console.log('🔒 protect middleware – headers:', req.headers.authorization, 'cookie:', req.cookies.jwt);
  let token;

  // 1) Extract token
  if (req.headers.authorization?.startsWith('Bearer')) {
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

  // 3) Check user exists & active
  const currentUser = await User.findById(decoded.id).select('+active');
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401)
    );
  }
  if (!currentUser.active) {
    return next(
      new AppError('Your account has been deactivated. Please contact support.', 403)
    );
  }

  // 4) Check password change
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  // 5) Grant access
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('You are not logged in.', 401));
  }
  if (!roles.includes(req.user.role)) {
    return next(new AppError('Unauthorized action.', 403));
  }
  next();
};
