const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, userValidation, loginValidation } = require('../utils/validation');

// Initiate registration process
router.post('/register/initiate', validate(userValidation), authController.initiateRegistration);

// Complete registration with OTP verification
router.post('/register/verify', validate(userValidation), authController.verifyAndRegister);

// Login user
router.post('/login', validate(loginValidation), authController.login);

// Refresh token
router.post('/refresh', authController.refreshToken);

// Logout user
router.post('/logout', authenticate, authController.logout);

// Get current user
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;