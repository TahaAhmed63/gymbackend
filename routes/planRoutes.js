const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/roleCheck');
const { validate, planValidation } = require('../utils/validation');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all plans
router.get('/', planController.getAllPlans);

// Get a specific plan
router.get('/:id', planController.getPlanById);

// Create a new plan
router.post(
  '/',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  planValidation,
  validate,
  planController.createPlan
);

// Update a plan
router.put(
  '/:id',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  planValidation,
  validate,
  planController.updatePlan
);

// Delete a plan
router.delete(
  '/:id',
  checkRole([ROLES.ADMIN]),
  planController.deletePlan
);

module.exports = router;