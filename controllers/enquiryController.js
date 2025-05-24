const { supabaseClient } = require('../config/supabase');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');
const { getWhatsAppLink } = require('../utils/helpers');

/**
 * Get all enquiries with pagination and filtering
 * @route GET /api/enquiries
 */
const getAllEnquiries = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const pagination = getPaginationParams(req);
    const gym_id = req.user.gym_id;
    
    // Build query
    let query = supabaseClient
      .from('enquiries')
      .select('*', { count: 'exact' })
      .eq('gym_id', gym_id);
    
    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
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
    
    // Add WhatsApp links to the response
    const enquiriesWithLinks = data.map(enquiry => ({
      ...enquiry,
      whatsapp_link: getWhatsAppLink(enquiry.phone)
    }));
    
    res.status(200).json({
      success: true,
      ...paginatedResponse(enquiriesWithLinks, count, pagination)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single enquiry by ID
 * @route GET /api/enquiries/:id
 */
const getEnquiryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gym_id = req.user.gym_id;
    
    const { data, error } = await supabaseClient
      .from('enquiries')
      .select('*')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }
    
    // Add WhatsApp link
    const enquiryWithLink = {
      ...data,
      whatsapp_link: getWhatsAppLink(data.phone)
    };
    
    res.status(200).json({
      success: true,
      data: enquiryWithLink
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new enquiry
 * @route POST /api/enquiries
 */
const createEnquiry = async (req, res, next) => {
  try {
    const { name, phone, email, message, status = 'open' } = req.body;
    const gym_id = req.user.gym_id;
    
    const { data, error } = await supabaseClient
      .from('enquiries')
      .insert([{ name, phone, email, message, status, gym_id }])
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
      message: 'Enquiry created successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an enquiry
 * @route PUT /api/enquiries/:id
 */
const updateEnquiry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email, message, status } = req.body;
    const gym_id = req.user.gym_id;
    
    // Check if enquiry exists and belongs to the gym
    const { data: existingEnquiry, error: findError } = await supabaseClient
      .from('enquiries')
      .select('id')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (findError || !existingEnquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }
    
    // Update enquiry
    const { data, error } = await supabaseClient
      .from('enquiries')
      .update({ 
        name, 
        phone, 
        email, 
        message, 
        status,
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
      message: 'Enquiry updated successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an enquiry
 * @route DELETE /api/enquiries/:id
 */
const deleteEnquiry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gym_id = req.user.gym_id;
    
    // Check if enquiry exists and belongs to the gym
    const { data: existingEnquiry, error: findError } = await supabaseClient
      .from('enquiries')
      .select('id')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (findError || !existingEnquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }
    
    // Delete enquiry
    const { error } = await supabaseClient
      .from('enquiries')
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
      message: 'Enquiry deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change enquiry status
 * @route PATCH /api/enquiries/:id/status
 */
const changeEnquiryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const gym_id = req.user.gym_id;
    
    if (!status || !['open', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value. Must be open or closed.'
      });
    }
    
    // Check if enquiry exists and belongs to the gym
    const { data: existingEnquiry, error: findError } = await supabaseClient
      .from('enquiries')
      .select('id')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (findError || !existingEnquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }
    
    // Update enquiry status
    const { data, error } = await supabaseClient
      .from('enquiries')
      .update({ 
        status,
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
      message: 'Enquiry status updated successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllEnquiries,
  getEnquiryById,
  createEnquiry,
  updateEnquiry,
  deleteEnquiry,
  changeEnquiryStatus
};