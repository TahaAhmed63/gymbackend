const { supabaseClient } = require('../config/supabase');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');

/**
 * Get all batches with pagination
 * @route GET /api/batches
 */
const getAllBatches = async (req, res, next) => {
  try {
    const pagination = getPaginationParams(req);
    const { search } = req.query;
    
    // Build query
    let query = supabaseClient.from('batches').select('*', { count: 'exact' });
    
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
 * Get a single batch by ID
 * @route GET /api/batches/:id
 */
const getBatchById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabaseClient
      .from('batches')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
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
 * Create a new batch
 * @route POST /api/batches
 */
const createBatch = async (req, res, next) => {
  try {
    const { name, schedule_time } = req.body;
    
    const { data, error } = await supabaseClient
      .from('batches')
      .insert([{ name, schedule_time }])
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
      message: 'Batch created successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a batch
 * @route PUT /api/batches/:id
 */
const updateBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, schedule_time } = req.body;
    
    // Check if batch exists
    const { data: existingBatch, error: findError } = await supabaseClient
      .from('batches')
      .select('id')
      .eq('id', id)
      .single();
    
    if (findError || !existingBatch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }
    
    // Update batch
    const { data, error } = await supabaseClient
      .from('batches')
      .update({ name, schedule_time, updated_at: new Date().toISOString() })
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
      message: 'Batch updated successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a batch
 * @route DELETE /api/batches/:id
 */
const deleteBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if batch exists
    const { data: existingBatch, error: findError } = await supabaseClient
      .from('batches')
      .select('id')
      .eq('id', id)
      .single();
    
    if (findError || !existingBatch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }
    
    // Check if batch is assigned to any member
    const { data: members, error: memberError } = await supabaseClient
      .from('members')
      .select('id')
      .eq('batch_id', id)
      .limit(1);
    
    if (!memberError && members.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete batch as it is assigned to members'
      });
    }
    
    // Delete batch
    const { error } = await supabaseClient
      .from('batches')
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
      message: 'Batch deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get members in a batch
 * @route GET /api/batches/:id/members
 */
const getBatchMembers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pagination = getPaginationParams(req);
    
    // Check if batch exists
    const { data: existingBatch, error: findError } = await supabaseClient
      .from('batches')
      .select('id')
      .eq('id', id)
      .single();
    
    if (findError || !existingBatch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }
    
    // Get members in the batch
    const { data, error, count } = await supabaseClient
      .from('members')
      .select('*', { count: 'exact' })
      .eq('batch_id', id)
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

module.exports = {
  getAllBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  getBatchMembers
};