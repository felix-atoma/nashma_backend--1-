const { body, param, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const AppError = require('../utils/appError');

// Utility to check if string is valid MongoDB ObjectId
const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// Reusable validation error formatter
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map(err => err.msg).join('. ');
    return next(new AppError(message, 400));
  }
  next();
};

// User signup validation
exports.validateSignup = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 50 }).withMessage('First name must be less than 50 characters'),
    
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ max: 50 }).withMessage('Last name must be less than 50 characters'),
    
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
    
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/).withMessage('Password must contain at least one number'),
    
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
    
  handleValidationErrors
];

// User login validation
exports.validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
    
  body('password')
    .notEmpty().withMessage('Password is required'),
    
  handleValidationErrors
];

// Forgot password validation
exports.validateEmail = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
    
  handleValidationErrors
];

// Reset password validation
exports.validateResetPassword = [
  param('token')
    .notEmpty().withMessage('Reset token is required'),
    
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
    
  handleValidationErrors
];

// Update password validation
exports.validateUpdatePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
    
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .not().equals(body('currentPassword'))
    .withMessage('New password must be different from current password'),
    
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
    
  handleValidationErrors
];

// Admin creation validation
exports.validateAdminCreation = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required'),
    
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required'),
    
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
    
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    
  handleValidationErrors
];

// User ID parameter validation
exports.validateUserId = [
  param('userId')
    .notEmpty().withMessage('User ID is required')
    .custom(isObjectId).withMessage('Invalid user ID format'),
    
  handleValidationErrors
];