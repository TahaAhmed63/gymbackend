const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/roleCheck');
const { validate, memberValidation } = require('../utils/validation');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all members
router.get('/', memberController.getAllMembers);

// Get a specific member
router.get('/:id', memberController.getMemberById);

// Create a new member
router.post(
  '/',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  validate(memberValidation),
  memberController.createMember
);

// Update a member
router.put(
  '/:id',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  validate(memberValidation),
  memberController.updateMember
);

// Delete a member
router.delete(
  '/:id',
  checkRole([ROLES.ADMIN]),
  memberController.deleteMember
);

// Check member status
router.post('/check-status', memberController.checkMemberStatus);

module.exports = router;