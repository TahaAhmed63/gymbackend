const { supabaseClient } = require('../config/supabase');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');

/**
 * Get all members with pagination and filtering
 * @route GET /api/members
 */
const getAllMembers = async (req, res, next) => {
  try {
    const { status, search, batch_id } = req.query;
    const pagination = getPaginationParams(req);
    const gym_id = req.user.gym_id;
    console.log(gym_id,"gym_id")
    // Build query
    let query = supabaseClient
      .from('members')
      .select(`
        *,
        batches:batch_id(id, name, schedule_time),
        plans:plan_id(id, name, duration_in_months, price)
      `, { count: 'exact' })
      .eq('gym_id', gym_id);
    
    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    
    if (batch_id) {
      query = query.eq('batch_id', batch_id);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    
    // Apply pagination
    const { data, error, count } = await query
      .range(pagination.startIndex, pagination.startIndex + pagination.limit - 1)
      .order('created_at', { ascending: false });
    console.log(data,error,"data erro")
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
 * Get a single member by ID
 * @route GET /api/members/:id
 */
const getMemberById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gym_id = req.user.gym_id;
    
    const { data, error } = await supabaseClient
      .from('members')
      .select(`
        *,
        batches:batch_id(id, name, schedule_time),
        plans:plan_id(id, name, duration_in_months, price)
      `)
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
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
 * Create a new member
 * @route POST /api/members
 */
const createMember = async (req, res, next) => {
  try {
    const { 
      name, phone, email, dob, gender, 
      status = 'active', batch_id, plan_id 
    } = req.body;
    const gym_id = req.user.gym_id;
    
    // Verify batch and plan belong to the same gym
    const { data: batchData, error: batchError } = await supabaseClient
      .from('batches')
      .select('id')
      .eq('id', batch_id)
      .eq('gym_id', gym_id)
      .single();
      
    if (batchError || !batchData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid batch selected'
      });
    }
    
    const { data: planData, error: planError } = await supabaseClient
      .from('plans')
      .select('id')
      .eq('id', plan_id)
      .eq('gym_id', gym_id)
      .single();
      
    if (planError || !planData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }
    
    const newMember = {
      name,
      phone,
      email,
      dob,
      gender,
      status,
      batch_id,
      plan_id,
      gym_id,
      join_date: new Date().toISOString()
    };
    
    const { data, error } = await supabaseClient
      .from('members')
      .insert([newMember])
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
      message: 'Member created successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a member
 * @route PUT /api/members/:id
 */
const updateMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email, dob, gender, status, batch_id, plan_id } = req.body;
    const gym_id = req.user.gym_id;
    
    // Check if member exists and belongs to the gym
    const { data: existingMember, error: findError } = await supabaseClient
      .from('members')
      .select('id')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (findError || !existingMember) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Verify new batch and plan belong to the same gym
    if (batch_id) {
      const { data: batchData, error: batchError } = await supabaseClient
        .from('batches')
        .select('id')
        .eq('id', batch_id)
        .eq('gym_id', gym_id)
        .single();
        
      if (batchError || !batchData) {
        return res.status(400).json({
          success: false,
          message: 'Invalid batch selected'
        });
      }
    }
    
    if (plan_id) {
      const { data: planData, error: planError } = await supabaseClient
        .from('plans')
        .select('id')
        .eq('id', plan_id)
        .eq('gym_id', gym_id)
        .single();
        
      if (planError || !planData) {
        return res.status(400).json({
          success: false,
          message: 'Invalid plan selected'
        });
      }
    }
    
    // Update member
    const { data, error } = await supabaseClient
      .from('members')
      .update({
        name,
        phone,
        email,
        dob,
        gender,
        status,
        batch_id,
        plan_id,
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
      message: 'Member updated successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a member
 * @route DELETE /api/members/:id
 */
const deleteMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gym_id = req.user.gym_id;
    
    // Check if member exists and belongs to the gym
    const { data: existingMember, error: findError } = await supabaseClient
      .from('members')
      .select('id')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (findError || !existingMember) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Delete member
    const { error } = await supabaseClient
      .from('members')
      .delete()
      .eq('id', id)
      .eq('gym_id', gym_id);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember
};