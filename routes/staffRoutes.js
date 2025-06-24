const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/roleCheck');

// Apply authentication middleware to all routes
router.use(authenticate);

// GET routes: accessible to all authenticated users
router.get('/', staffController.getAllStaff);
router.get('/:id', staffController.getStaffById);

// The following routes are admin-only
router.post('/', checkRole([ROLES.ADMIN]), staffController.createStaff);
router.put('/:id', checkRole([ROLES.ADMIN]), staffController.updateStaff);
router.delete('/:id', checkRole([ROLES.ADMIN]), staffController.deleteStaff);
router.patch('/:id/permissions', checkRole([ROLES.ADMIN]), staffController.updateStaffPermissions);

module.exports = router;