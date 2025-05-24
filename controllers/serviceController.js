const { supabaseClient } = require('../config/supabase');

/**
 * Get all services
 * @route GET /api/services
 */
const getAllServices = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const gym_id = req.user.gym_id;
    
    let query = supabaseClient
      .from('services')
      .select('*', { count: 'exact' })
      .eq('gym_id', gym_id);
    
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    
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
        services: data,
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
 * Get service by ID
 * @route GET /api/services/:id
 */
const getServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gym_id = req.user.gym_id;
    
    const { data, error } = await supabaseClient
      .from('services')
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
        message: 'Service not found'
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
 * Create new service
 * @route POST /api/services
 */
const createService = async (req, res, next) => {
  try {
    const { name, description, price, duration, category } = req.body;
    const gym_id = req.user.gym_id;
    
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: 'Name and price are required'
      });
    }
    
    const { data, error } = await supabaseClient
      .from('services')
      .insert([
        {
          name,
          description,
          price,
          duration,
          category,
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
 * Update service
 * @route PUT /api/services/:id
 */
const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, duration, category } = req.body;
    const gym_id = req.user.gym_id;
    
    // Check if service exists and belongs to the gym
    const { data: existingService, error: checkError } = await supabaseClient
      .from('services')
      .select('id')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (checkError || !existingService) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    const { data, error } = await supabaseClient
      .from('services')
      .update({
        name,
        description,
        price,
        duration,
        category,
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

/**
 * Delete service
 * @route DELETE /api/services/:id
 */
const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gym_id = req.user.gym_id;
    
    // Check if service exists and belongs to the gym
    const { data: existingService, error: checkError } = await supabaseClient
      .from('services')
      .select('id')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (checkError || !existingService) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    // Check if service is being used by any members
    const { data: members, error: memberError } = await supabaseClient
      .from('members')
      .select('id')
      .eq('service_id', id)
      .eq('gym_id', gym_id)
      .limit(1);
    
    if (memberError) {
      return res.status(400).json({
        success: false,
        message: memberError.message
      });
    }
    
    if (members && members.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete service as it is being used by members'
      });
    }
    
    const { error } = await supabaseClient
      .from('services')
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
      message: 'Service deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};