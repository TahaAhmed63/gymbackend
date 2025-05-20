const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/roleCheck');
const { validate, attendanceValidation } = require('../utils/validation');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get attendance records
router.get('/', attendanceController.getAttendance);

// Get attendance report
router.get('/report', attendanceController.getAttendanceReport);

// Record attendance for a member
router.post(
  '/',
  checkRole([ROLES.ADMIN, ROLES.STAFF, ROLES.TRAINER]),
  attendanceValidation,
  validate,
  attendanceController.recordAttendance
);

// Record batch attendance
router.post(
  '/batch',
  checkRole([ROLES.ADMIN, ROLES.STAFF, ROLES.TRAINER]),
  attendanceController.recordBatchAttendance
);

module.exports = router;