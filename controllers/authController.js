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
    console.log('Generated OTP:', otp);
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

    console.log('Stored OTP data:', {
      email,
      storedOtp: otp,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {
    console.error('Initiate registration error:', error);
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
    console.log('Verification attempt:', { email, receivedOtp: otp });

    // Get stored registration data
    const storedData = otpStore.get(email);
    
    if (!storedData) {
      console.log('No stored data found    email:', email);
      return res.status(400).json({
        success: false,
        message: 'Registration session expired or invalid'
      });
    }

    // Check OTP expiration (10 minutes)
    const timeElapsed = Date.now() - storedData.timestamp;
    console.log('Time elapsed since OTP generation:', timeElapsed / 1000, 'seconds');

    if (timeElapsed > 10 * 60 * 1000) {
      otpStore.delete(email);
      return res.status(400).json({
        success: false,
        message: 'OTP expired'
      });
    }

    // Verify OTP
    console.log('Comparing OTPs:', {
      received: otp,
      stored: storedData.otp,
      match: otp === storedData.otp
    });

    if (otp !== storedData.otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    const { name, phone, password, gymName, country } = storedData.data;
console.log(storedData.data)
    console.log('Creating Supabase auth user...');
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password
    });
    
    if (authError) {
      console.error('Supabase auth error:', authError);
      return res.status(400).json({
        success: false,
        message: authError.message
      });
    }

    console.log('Auth user created:', authData);
    
    console.log('Creating user profile...');
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
          role: 'admin',
          gym_id: authData.user.id // Set gym_id to user's own ID for gym owners
        }
      ])
      .select();
    
    if (userError) {
      console.error('User profile creation error:', userError);
      // Rollback: Delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return res.status(400).json({
        success: false,
        message: userError.message
      });
    }

    console.log('User profile created:', userData);

    // Clear stored data
    otpStore.delete(email);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: authData.user.id,
        email: authData.user.email,
        gym_id: authData.user.id
      }
    });
  } catch (error) {
    console.error('Verify and register error:', error);
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
    console.log('Login attempt for:', email);
    
    // Authenticate with Supabase
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Login error:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Get user role and profile data
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('role, name, gym_id, country,gym_name')
      .eq('id', data.user.id)
      .single();
    
    if (userError) {
      console.error('User profile error:', userError);
      return res.status(500).json({
        success: false,
        message: 'Error retrieving user profile'
      });
    }
    
    if (!userData) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    // Fetch staff data if user is staff
    let staffData = null;
    if (userData.role === 'staff') {
      const { data: staff, error: staffError } = await supabaseClient
        .from('staff')
        .select('*')
        .eq('user_id', data.user.id)
        .single();
      if (!staffError && staff) {
        staffData = staff;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: userData.name,
          role: userData.role,
          gym_id: userData.gym_id,
          gym_name:userData.gym_name,
          country: userData.country,
          staff: staffData // include staff data if present
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
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
      console.error('Get current user error:', error);
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }
    
    console.log('Current user data:', data);
    
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get current user error:', error);
    next(error);
  }
};

/**
 * Refresh access token
 * @route POST /api/auth/refresh
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Refresh the session using Supabase
    const { data, error } = await supabaseClient.auth.refreshSession({
      refresh_token
    });

    if (error) {
      console.error('Token refresh error:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    next(error);
  }
};

module.exports = {
  initiateRegistration,
  verifyAndRegister,
  login,
  logout,
  getCurrentUser,
  refreshToken
};