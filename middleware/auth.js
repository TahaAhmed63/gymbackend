const { supabaseClient } = require('../config/supabase');

/**
 * Authentication middleware to verify JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required. Please provide a valid token.' 
      });
    }

    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    // Get user profile data from users table
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return res.status(401).json({
        success: false,
        message: 'Error fetching user profile'
      });
    }

    if (!userProfile) {
      return res.status(401).json({
        success: false,
        message: 'User profile not found'
      });
    }

    // Merge auth user data with profile data
    req.user = {
      ...user,
      ...userProfile
    };

    console.log('Authenticated user data:', req.user); // Debug log
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    next(error);
  }
};

module.exports = { authenticate };