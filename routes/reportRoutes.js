const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/roleCheck');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get expiring members
router.get('/expiring', 
  checkRole([ROLES.ADMIN, ROLES.STAFF]), 
  reportController.getExpiringMembers
);

// Get birthday members
router.get('/birthday', 
  checkRole([ROLES.ADMIN, ROLES.STAFF, ROLES.TRAINER]), 
  reportController.getBirthdayMembers
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

// Download reports
router.get('/download/:type', 
  checkRole([ROLES.ADMIN, ROLES.STAFF]), 
  reportController.downloadReport
);

// Download single member reports
router.get('/download/member/:memberId/profile',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  reportController.downloadMemberProfile
);

router.get('/download/member/:memberId/payments',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  reportController.downloadMemberPayments
);

router.get('/download/member/:memberId/attendance',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  reportController.downloadMemberAttendance
);

router.get('/download/member/:memberId/financial-summary',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  reportController.downloadMemberFinancialSummary
);

module.exports = router;