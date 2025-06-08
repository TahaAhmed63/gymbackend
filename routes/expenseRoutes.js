const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/roleCheck');
const { validate, expenseValidation } = require('../utils/validation');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all expenses
router.get('/', 
  checkRole([ROLES.ADMIN, ROLES.STAFF]), 
  expenseController.getAllExpenses
);

// Get expense summary
router.get('/summary', 
  checkRole([ROLES.ADMIN, ROLES.STAFF]), 
  expenseController.getExpenseSummary
);

// Get a specific expense
router.get('/:id', 
  checkRole([ROLES.ADMIN, ROLES.STAFF]), 
  expenseController.getExpenseById
);

// Create a new expense
router.post(
  '/',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  validate(expenseValidation),
  expenseController.createExpense
);

// Update an expense
router.put(
  '/:id',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  validate(expenseValidation),
  expenseController.updateExpense
);

// Delete an expense
router.delete(
  '/:id',
  checkRole([ROLES.ADMIN]),
  expenseController.deleteExpense
);

module.exports = router;