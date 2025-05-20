const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/roleCheck');
const { validate, serviceValidation } = require('../utils/validation');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all services
router.get('/', serviceController.getAllServices);

// Get a specific service
router.get('/:id', serviceController.getServiceById);

// Create a new service
router.post(
  '/',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  serviceValidation,
  validate,
  serviceController.createService
);

// Update a service
router.put(
  '/:id',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  serviceValidation,
  validate,
  serviceController.updateService
);

// Delete a service
router.delete(
  '/:id',
  checkRole([ROLES.ADMIN]),
  serviceController.deleteService
);

module.exports = router;