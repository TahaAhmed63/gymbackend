const { supabaseClient, supabaseAdmin } = require('../config/supabase');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');

/**
 * Get all staff with pagination
 * @route GET /api/staff
 */
const getAllStaff = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const pagination = getPaginationParams(req);
    
    // Build query
    let query = supabaseClient.from('staff').select('*', { count: 'exact' });
    
    // Apply filters
    if (role) {
      query = query.eq('role', role);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    
    // Apply pagination
    const { data, error, count } = await query
      .range(pagination.startIndex, pagination.startIndex + pagination.limit - 1)
      .order('name', { ascending: true });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(200).json({
      success: true,
      ...paginatedResponse(data, count, pagination)
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
    
    const { data, error } = await supabaseClient
      .from('staff')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
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
    const { name, email, phone, role, permissions } = req.body;
    
    // Check if user account exists or create one
    let userId;
    
    // Check if user already exists with this email
    const { data: existingUser, error: userExistsError } = await supabaseAdmin.auth.admin.listUsers();
    
    const userExists = existingUser?.users?.find(user => user.email === email);
    
    if (userExists) {
      userId = userExists.id;
    } else {
      // Generate a random password for the new user
      const tempPassword = Math.random().toString(36).slice(-8);
      
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
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
            role: role.toLowerCase()
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
    
    // Create staff record
    const { data, error } = await supabaseClient
      .from('staff')
      .insert([
        {
          user_id: userId,
          name,
          email,
          phone,
          role,
          permissions
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
      message: 'Staff created successfully',
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
    
    // Check if staff exists
    const { data: existingStaff, error: findError } = await supabaseClient
      .from('staff')
      .select('id, user_id')
      .eq('id', id)
      .single();
    
    if (findError || !existingStaff) {
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
        .eq('id', existingStaff.user_id);
    }
    
    res.status(200).json({
      success: true,
      message: 'Staff updated successfully',
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
    
    // Check if staff exists
    const { data: existingStaff, error: findError } = await supabaseClient
      .from('staff')
      .select('id, user_id')
      .eq('id', id)
      .single();
    
    if (findError || !existingStaff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }
    
    // Delete staff record
    const { error } = await supabaseClient
      .from('staff')
      .delete()
      .eq('id', id);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Delete user account if requested and user_id exists
    if (deleteUser && existingStaff.user_id) {
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
    
    if (!permissions) {
      return res.status(400).json({
        success: false,
        message: 'Permissions are required'
      });
    }
    
    // Check if staff exists
    const { data: existingStaff, error: findError } = await supabaseClient
      .from('staff')
      .select('id')
      .eq('id', id)
      .single();
    
    if (findError || !existingStaff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }
    
    // Update staff permissions
    const { data, error } = await supabaseClient
      .from('staff')
      .update({ 
        permissions,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
      message: 'Staff permissions updated successfully',
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