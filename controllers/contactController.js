// controllers/contactController.js
const Contact = require('../models/Contact');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Public contact submission
exports.submitContact = catchAsync(async (req, res, next) => {
  const { name, email, phone, subject, message } = req.body;

  const newContact = await Contact.create({
    name,
    email,
    phone,
    subject,
    message
  });

  res.status(201).json({
    status: 'success',
    data: {
      contact: newContact
    }
  });
});

// Admin-only methods
exports.getAllContacts = catchAsync(async (req, res, next) => {
  const contacts = await Contact.find().sort('-createdAt');
  
  res.status(200).json({
    status: 'success',
    results: contacts.length,
    data: {
      contacts
    }
  });
});

exports.getContact = catchAsync(async (req, res, next) => {
  const contact = await Contact.findById(req.params.id);
  
  if (!contact) {
    return next(new AppError('No contact found with that ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      contact
    }
  });
});

exports.deleteContact = catchAsync(async (req, res, next) => {
  const contact = await Contact.findByIdAndDelete(req.params.id);
  
  if (!contact) {
    return next(new AppError('No contact found with that ID', 404));
  }
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Make sure all methods are exported
module.exports = {
  submitContact: exports.submitContact,
  getAllContacts: exports.getAllContacts,
  getContact: exports.getContact,
  deleteContact: exports.deleteContact
};