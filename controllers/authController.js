const { supabaseClient, supabaseAdmin } = require('../config/supabase');
const { generateOTP, sendOTPEmail } = require('../utils/emailService');

// Store OTPs temporarily (in production, use Redis or similar)
const otpStore = new Map();

/**
 * Initiate registration process
 * @route POST /api/auth/register/initiate
 */
const initiateRegistration = async (req, res, next) => {
  try {
    const { name, email, phone, password, gymName, country } = req.body;
    console.log(req.body,"req.body")
    // Check if user already exists
    const { data: existingUser } = await supabaseClient
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate and send OTP
    const otp = generateOTP();
    const emailSent = await sendOTPEmail(email, otp);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }

    // Store registration data and OTP
    otpStore.set(email, {
      otp,
      data: { name, email, phone, password, gymName, country },
      timestamp: Date.now()
    });

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete registration with OTP verification
 * @route POST /api/auth/register/verify
 */
const verifyAndRegister = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // Get stored registration data
    const storedData = otpStore.get(email);
    
    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: 'Registration session expired or invalid'
      });
    }

    // Check OTP expiration (10 minutes)
    if (Date.now() - storedData.timestamp > 10 * 60 * 1000) {
      otpStore.delete(email);
      return res.status(400).json({
        success: false,
        message: 'OTP expired'
      });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    const { name, phone, password, gymName, country } = storedData.data;

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password
    });
    
    if (authError) {
      return res.status(400).json({
        success: false,
        message: authError.message
      });
    }
    
    // Create user profile in users table
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .insert([
        {
          id: authData.user.id,
          name,
          email,
          phone,
          gym_name: gymName,
          country,
          role: 'staff'
        }
      ]);
    
    if (userError) {
      // Rollback: Delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return res.status(400).json({
        success: false,
        message: userError.message
      });
    }

    // Clear stored data
    otpStore.delete(email);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: authData.user.id,
        email: authData.user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log(email, password)
    // Authenticate with Supabase
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.log(error)
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Get user role
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('role, name')
      .eq('id', data.user.id)
      .single();
    console.log(userData)
    if (userError) {
      return res.status(500).json({
        success: false,
        message: 'Error retrieving user profile'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: userData.name,
          role: userData.role
        },
        session: {
          access_token: data.session.access_token,
          expires_at: data.session.expires_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * @route POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const { error } = await supabaseClient.auth.signOut();
    
    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * @route GET /api/auth/me
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initiateRegistration,
  verifyAndRegister,
  login,
  logout,
  getCurrentUser
};