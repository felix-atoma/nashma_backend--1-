// controllers/userController.js

const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Only pick allowed fields
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(key => {
    if (allowedFields.includes(key)) newObj[key] = obj[key];
  });
  return newObj;
};

// Preload req.params.id for “getUser”
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// GET /api/users (admin only)
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users },
  });
});

// GET /api/users/:id
exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }
  res.status(200).json({ status: 'success', data: { user } });
});

// PATCH /api/users/updateMe
exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Use /api/auth/updatePassword.',
        400
      )
    );
  }

  const filteredBody = filterObj(req.body, 'name', 'email');
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    filteredBody,
    { new: true, runValidators: true }
  );
  res.status(200).json({ status: 'success', data: { user: updatedUser } });
});

// DELETE /api/users/deleteMe
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({ status: 'success', data: null });
});

// Admin-only: create, update, delete other users
exports.createUser = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm, role } = req.body;
  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    role: role || 'user',
  });
  res.status(201).json({ status: 'success', data: { user: newUser } });
});

exports.updateUser = catchAsync(async (req, res, next) => {
  const filteredBody = filterObj(req.body, 'name', 'email', 'role');
  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    filteredBody,
    { new: true, runValidators: true }
  );
  if (!updatedUser) {
    return next(new AppError('No user found with that ID', 404));
  }
  res.status(200).json({ status: 'success', data: { user: updatedUser } });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }
  res.status(204).json({ status: 'success', data: null });
});

// GET /api/users/admins
exports.getAllAdmins = catchAsync(async (req, res, next) => {
  const admins = await User.find({ role: 'admin' });
  res
    .status(200)
    .json({ status: 'success', results: admins.length, data: { admins } });
});

// GET /api/users/stats
exports.getAdminStats = catchAsync(async (req, res, next) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$active', true] }, 1, 0] } },
      },
    },
  ]);
  res.status(200).json({ status: 'success', data: { stats } });
});
