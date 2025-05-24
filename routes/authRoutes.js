const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, userValidation } = require('../utils/validation');

// Initiate registration process
router.post('/register/initiate', userValidation, validate, authController.initiateRegistration);

// Complete registration with OTP verification
router.post('/register/verify', authController.verifyAndRegister);

// Login user
router.post('/login', authController.login);

// Logout user
router.post('/logout', authController.logout);

// Get current user
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;