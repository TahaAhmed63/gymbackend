const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }
  next();
};

// Common validation rules
const userValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Must be a valid email address'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('gymName').notEmpty().withMessage('Gym name is required'),
  body('country').notEmpty().withMessage('Country is required')
];

const memberValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Must be a valid email address'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('dob').optional().isDate().withMessage('Invalid date of birth'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  body('status').isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
  body('batch_id').optional().isUUID().withMessage('Invalid batch ID')
];

const batchValidation = [
  body('name').notEmpty().withMessage('Batch name is required'),
  body('schedule_time').notEmpty().withMessage('Schedule time is required')
];

const attendanceValidation = [
  body('member_id').isUUID().withMessage('Invalid member ID'),
  body('date').isDate().withMessage('Invalid date'),
  body('status').isIn(['present', 'absent']).withMessage('Status must be present or absent')
];

const paymentValidation = [
  body('member_id').isUUID().withMessage('Invalid member ID'),
  body('amount_paid').isNumeric().withMessage('Amount paid must be a number'),
  body('total_amount').isNumeric().withMessage('Total amount must be a number'),
  body('payment_date').isDate().withMessage('Invalid payment date')
];

const planValidation = [
  body('name').notEmpty().withMessage('Plan name is required'),
  body('duration_in_months').isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
  body('price').isNumeric().withMessage('Price must be a number')
];

const serviceValidation = [
  body('name').notEmpty().withMessage('Service name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('price').isNumeric().withMessage('Price must be a number')
];

const enquiryValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('status').isIn(['open', 'closed']).withMessage('Status must be open or closed')
];

const expenseValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('date').isDate().withMessage('Invalid date')
];

module.exports = {
  validate,
  userValidation,
  memberValidation,
  batchValidation,
  attendanceValidation,
  paymentValidation,
  planValidation,
  serviceValidation,
  enquiryValidation,
  expenseValidation
};