const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/roleCheck');

// Apply authentication middleware to all routes
router.use(authenticate);
// Apply admin role check to all routes
router.use(checkRole([ROLES.ADMIN]));

// Get all staff
router.get('/', staffController.getAllStaff);

// Get a specific staff
router.get('/:id', staffController.getStaffById);

// Create a new staff
router.post('/', staffController.createStaff);

// Update a staff
router.put('/:id', staffController.updateStaff);

// Delete a staff
router.delete('/:id', staffController.deleteStaff);

// Update staff permissions
router.patch('/:id/permissions', staffController.updateStaffPermissions);

module.exports = router;