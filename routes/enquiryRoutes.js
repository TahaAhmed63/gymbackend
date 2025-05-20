const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiryController');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/roleCheck');
const { validate, enquiryValidation } = require('../utils/validation');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all enquiries
router.get('/', enquiryController.getAllEnquiries);

// Get a specific enquiry
router.get('/:id', enquiryController.getEnquiryById);

// Create a new enquiry
router.post(
  '/',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  enquiryValidation,
  validate,
  enquiryController.createEnquiry
);

// Update an enquiry
router.put(
  '/:id',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  enquiryValidation,
  validate,
  enquiryController.updateEnquiry
);

// Delete an enquiry
router.delete(
  '/:id',
  checkRole([ROLES.ADMIN]),
  enquiryController.deleteEnquiry
);

// Change enquiry status
router.patch(
  '/:id/status',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  enquiryController.changeEnquiryStatus
);

module.exports = router;