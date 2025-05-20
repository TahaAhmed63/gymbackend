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
    
    // Build query
    let query = supabaseClient.from('members').select('*', { count: 'exact' });
    
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
    
    const { data, error } = await supabaseClient
      .from('members')
      .select(`
        *,
        batches:batch_id(id, name, schedule_time)
      `)
      .eq('id', id)
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
    
    const newMember = {
      name,
      phone,
      email,
      dob,
      gender,
      status,
      batch_id,
      plan_id,
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
    
    // Check if member exists
    const { data: existingMember, error: findError } = await supabaseClient
      .from('members')
      .select('id')
      .eq('id', id)
      .single();
    
    if (findError || !existingMember) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
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
    
    // Check if member exists
    const { data: existingMember, error: findError } = await supabaseClient
      .from('members')
      .select('id')
      .eq('id', id)
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
      .eq('id', id);
    
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