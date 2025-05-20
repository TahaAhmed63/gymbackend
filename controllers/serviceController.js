const { supabaseClient } = require('../config/supabase');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');

/**
 * Get all services with pagination
 * @route GET /api/services
 */
const getAllServices = async (req, res, next) => {
  try {
    const pagination = getPaginationParams(req);
    const { search } = req.query;
    
    // Build query
    let query = supabaseClient.from('services').select('*', { count: 'exact' });
    
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
 * Get a single service by ID
 * @route GET /api/services/:id
 */
const getServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabaseClient
      .from('services')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
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
 * Create a new service
 * @route POST /api/services
 */
const createService = async (req, res, next) => {
  try {
    const { name, description, price } = req.body;
    
    const { data, error } = await supabaseClient
      .from('services')
      .insert([{ name, description, price }])
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
      message: 'Service created successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a service
 * @route PUT /api/services/:id
 */
const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price } = req.body;
    
    // Check if service exists
    const { data: existingService, error: findError } = await supabaseClient
      .from('services')
      .select('id')
      .eq('id', id)
      .single();
    
    if (findError || !existingService) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    // Update service
    const { data, error } = await supabaseClient
      .from('services')
      .update({ 
        name, 
        description, 
        price,
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
      message: 'Service updated successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a service
 * @route DELETE /api/services/:id
 */
const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if service exists
    const { data: existingService, error: findError } = await supabaseClient
      .from('services')
      .select('id')
      .eq('id', id)
      .single();
    
    if (findError || !existingService) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    // Delete service
    const { error } = await supabaseClient
      .from('services')
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