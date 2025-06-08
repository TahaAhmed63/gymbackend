const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/roleCheck');
const { validate, paymentValidation } = require('../utils/validation');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all payments
router.get('/', paymentController.getAllPayments);

// Get payment summary
router.get('/summary', paymentController.getPaymentSummary);

// Get payments by member
router.get('/member/:memberId', paymentController.getMemberPayments);

// Get a specific payment
router.get('/:id', paymentController.getPaymentById);

// Create a new payment
router.post(
  '/',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  validate(paymentValidation),
  paymentController.createPayment
);

// Update a payment
router.put(
  '/:id',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  validate(paymentValidation),
  paymentController.updatePayment
);

// Delete a payment
router.delete(
  '/:id',
  checkRole([ROLES.ADMIN]),
  paymentController.deletePayment
);

module.exports = router;