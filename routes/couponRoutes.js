const express = require('express');
const couponController = require('../controllers/couponController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Admin-only routes
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(couponController.getAllCoupons)
  .post(couponController.createCoupon);

router
  .route('/:id')
  .get(couponController.getCoupon)
  .patch(couponController.updateCoupon)
  .delete(couponController.deleteCoupon);

// User routes
router.use(authController.restrictTo('user'));
router.post('/validate', couponController.validateCoupon);

module.exports = router;