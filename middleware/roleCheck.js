const { supabaseClient } = require('../config/supabase');

/**
 * Middleware to check if user has the required role
 * @param {Array} allowedRoles - Array of roles that have access
 */
const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      // Fetch user profile from users table to get role
      const { data: userData, error } = await supabaseClient
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error || !userData) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }
      
      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(userData.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to perform this action.'
        });
      }
      
      // Attach user role to request
      req.userRole = userData.role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Role constants
const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  TRAINER: 'trainer'
};

module.exports = { checkRole, ROLES };