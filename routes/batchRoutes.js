const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/roleCheck');
const { validate, batchValidation } = require('../utils/validation');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all batches
router.get('/', batchController.getAllBatches);

// Get a specific batch
router.get('/:id', batchController.getBatchById);

// Get members in a batch
router.get('/:id/members', batchController.getBatchMembers);

// Create a new batch
router.post(
  '/',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  batchValidation,
  validate,
  batchController.createBatch
);

// Update a batch
router.put(
  '/:id',
  checkRole([ROLES.ADMIN, ROLES.STAFF]),
  batchValidation,
  validate,
  batchController.updateBatch
);

// Delete a batch
router.delete(
  '/:id',
  checkRole([ROLES.ADMIN]),
  batchController.deleteBatch
);

module.exports = router;