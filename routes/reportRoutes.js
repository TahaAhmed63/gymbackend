const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/roleCheck');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get expiring memberships report
router.get('/expiring-memberships', 
  checkRole([ROLES.ADMIN, ROLES.STAFF]), 
  reportController.getExpiringMemberships
);

// Get upcoming birthdays report
router.get('/birthdays', 
  checkRole([ROLES.ADMIN, ROLES.STAFF, ROLES.TRAINER]), 
  reportController.getUpcomingBirthdays
);

// Get payment status report
router.get('/payment-status', 
  checkRole([ROLES.ADMIN, ROLES.STAFF]), 
  reportController.getPaymentStatusReport
);

// Get attendance summary report
router.get('/attendance-summary', 
  checkRole([ROLES.ADMIN, ROLES.STAFF, ROLES.TRAINER]), 
  reportController.getAttendanceSummaryReport
);

// Get financial summary report
router.get('/financial-summary', 
  checkRole([ROLES.ADMIN]), 
  reportController.getFinancialSummaryReport
);

module.exports = router;