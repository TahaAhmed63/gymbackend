const { supabaseClient } = require('../config/supabase');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');

/**
 * Get all plans with pagination
 * @route GET /api/plans
 */
const getAllPlans = async (req, res, next) => {
  try {
    const pagination = getPaginationParams(req);
    const { search } = req.query;
    const gym_id = req.user.gym_id;
    
    // Build query
    let query = supabaseClient
      .from('plans')
      .select(`
        *,
        members:members!plan_id(count)
      `, { count: 'exact' })
      .eq('gym_id', gym_id);
    
    // Apply search filter if provided
    if (search) {
      query = query.ilike('name', `%${search}%`);
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
 * Get a single plan by ID
 * @route GET /api/plans/:id
 */
const getPlanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gym_id = req.user.gym_id;
    
    const { data, error } = await supabaseClient
      .from('plans')
      .select(`
        *,
        members:members!plan_id(count)
      `)
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
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
 * Create a new plan
 * @route POST /api/plans
 */
const createPlan = async (req, res, next) => {
  try {
    const { 
      name, 
      duration_in_months, 
      price,
      description 
    } = req.body;
    console.log(req.body,"req.body")
    const gym_id = req.user.gym_id;
console.log(gym_id,"gym_id")
    // Validate gym_id
    if (!gym_id) {
      return res.status(400).json({
        success: false,
        message: 'User does not have a valid gym_id'
      });
    }

    // Verify gym_id exists in users table
    const { data: gymUser, error: gymError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('id', gym_id)
      .single();
console.log(gymUser,"data")
  
  
    
    console.log('Inserting plan with data:', { 
      name, 
      duration_in_months, 
      price,
      description,
      gym_id
    });
    
    const { data, error } = await supabaseClient
      .from('plans')
      .insert([{ 
        name, 
        duration_in_months, 
        price,
        description,
        gym_id
      }])
      .select()
      .single();
    
    console.log('Query result:', { data, error });
    if (error) {
      console.log(error,"error")
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a plan
 * @route PUT /api/plans/:id
 */
const updatePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      duration_in_months, 
      price,
      description 
    } = req.body;
    const gym_id = req.user.gym_id;
    
    // Check if plan exists and belongs to the gym
    const { data: existingPlan, error: findError } = await supabaseClient
      .from('plans')
      .select('id')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (findError || !existingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }
    
    // Update plan
    const { data, error } = await supabaseClient
      .from('plans')
      .update({ 
        name, 
        duration_in_months, 
        price,
        description,
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
      message: 'Plan updated successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a plan
 * @route DELETE /api/plans/:id
 */
const deletePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gym_id = req.user.gym_id;
    
    // Check if plan exists and belongs to the gym
    const { data: existingPlan, error: findError } = await supabaseClient
      .from('plans')
      .select('id')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (findError || !existingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }
    
    // Check if plan is assigned to any member
    const { data: members, error: memberError } = await supabaseClient
      .from('members')
      .select('id')
      .eq('plan_id', id)
      .eq('gym_id', gym_id)
      .limit(1);
    
    if (!memberError && members.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete plan as it is assigned to members'
      });
    }
    
    // Delete plan
    const { error } = await supabaseClient
      .from('plans')
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
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan
};