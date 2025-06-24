const { supabaseClient, supabaseAdmin } = require('../config/supabase');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');

/**
 * Get all staff with pagination
 * @route GET /api/staff
 */
const getAllStaff = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 10 } = req.query;
    const gym_id = req.user.gym_id;
    
    // Build query
    let query = supabaseClient
      .from('staff')
      .select('*', { count: 'exact' })
      .eq('gym_id', gym_id);
    
    // Apply filters
    if (role) {
      query = query.eq('role', role);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    
    // Apply pagination
    const { data, error, count } = await query
      .order('name')
      .range((page - 1) * limit, page * limit - 1);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        staff: data,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single staff by ID
 * @route GET /api/staff/:id
 */
const getStaffById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gym_id = req.user.gym_id;
    
    const { data, error } = await supabaseClient
      .from('staff')
      .select('*')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
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

/**
 * Create a new staff
 * @route POST /api/staff
 */
const createStaff = async (req, res, next) => {
  try {
    let { name, email, phone, role, permissions, password } = req.body;
    const gym_id = req.user.gym_id;

    // Set default role to 'staff' if not provided
    if (!role) {
      role = 'staff';
    }

    if (!name || !email || !role || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, role, and password are required'
      });
    }
    
    // Check if user account exists or create one
    let userId;
    
    // Check if user already exists with this email
    const { data: existingUser, error: userExistsError } = await supabaseAdmin.auth.admin.listUsers();
    
    const userExists = existingUser?.users?.find(user => user.email === email);
    
    if (userExists) {
      userId = userExists.id;
    } else {
      // Use admin-provided password for the new user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      
      if (authError) {
        return res.status(400).json({
          success: false,
          message: authError.message
        });
      }
      
      userId = authData.user.id;
      
      // Create user profile in users table
      const { error: userProfileError } = await supabaseClient
        .from('users')
        .insert([
          {
            id: userId,
            name,
            email,
            phone,
            role: role.toLowerCase(),
            gym_id
          }
        ]);
      
      if (userProfileError) {
        // Rollback: Delete the auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(userId);
        
        return res.status(400).json({
          success: false,
          message: userProfileError.message
        });
      }
    }
    
    // Create staff record (no duplicate check on user_id+gym_id, user_id is always unique)
    const { data, error } = await supabaseClient
      .from('staff')
      .insert([
        {
          user_id: userId,
          name,
            email,
            phone,
          role,
          permissions,
          gym_id
        }
      ])
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a staff
 * @route PUT /api/staff/:id
 */
const updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, role, permissions } = req.body;
    const gym_id = req.user.gym_id;
    
    // Check if staff exists and belongs to the gym
    const { data: existingStaff, error: checkError } = await supabaseClient
      .from('staff')
      .select('id, user_id')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (checkError || !existingStaff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }
    
    // Update staff record
    const { data, error } = await supabaseClient
      .from('staff')
      .update({
        name,
        phone,
        role,
        permissions,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('gym_id', gym_id)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Update user profile if user_id exists
    if (existingStaff.user_id) {
      await supabaseClient
        .from('users')
        .update({
          name,
          phone,
          role: role.toLowerCase(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingStaff.user_id)
        .eq('gym_id', gym_id);
    }
    
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a staff
 * @route DELETE /api/staff/:id
 */
const deleteStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deleteUser = false } = req.body;
    const gym_id = req.user.gym_id;
    
    // Check if staff exists and belongs to the gym
    const { data: existingStaff, error: checkError } = await supabaseClient
      .from('staff')
      .select('id, user_id')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (checkError || !existingStaff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }
    
    // Delete staff record
    const { error: deleteError } = await supabaseClient
      .from('staff')
      .delete()
      .eq('id', id)
      .eq('gym_id', gym_id);
    
    if (deleteError) {
      return res.status(400).json({
        success: false,
        message: deleteError.message
      });
    }
    
    // Delete user account if requested
    if (deleteUser && existingStaff.user_id) {
      // Delete user profile
      await supabaseClient
        .from('users')
        .delete()
        .eq('id', existingStaff.user_id)
        .eq('gym_id', gym_id);
      
      // Delete auth user
      await supabaseAdmin.auth.admin.deleteUser(existingStaff.user_id);
    }
    
    res.status(200).json({
      success: true,
      message: 'Staff deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update staff permissions
 * @route PATCH /api/staff/:id/permissions
 */
const updateStaffPermissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    const gym_id = req.user.gym_id;
    
    if (!permissions) {
      return res.status(400).json({
        success: false,
        message: 'Permissions are required'
      });
    }
    
    // Check if staff exists and belongs to the gym
    const { data: existingStaff, error: checkError } = await supabaseClient
      .from('staff')
      .select('id')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (checkError || !existingStaff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }
    
    // Update permissions
    const { data, error } = await supabaseClient
      .from('staff')
      .update({
        permissions,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('gym_id', gym_id)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
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
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  updateStaffPermissions
};