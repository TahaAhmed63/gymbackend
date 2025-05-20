const { supabaseClient } = require('../config/supabase');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');
const { calculateDueAmount } = require('../utils/helpers');

/**
 * Get all payments with pagination and filtering
 * @route GET /api/payments
 */
const getAllPayments = async (req, res, next) => {
  try {
    const { member_id, start_date, end_date } = req.query;
    const pagination = getPaginationParams(req);
    
    // Build query
    let query = supabaseClient
      .from('payments')
      .select('*, members(id, name)', { count: 'exact' });
    
    // Apply filters
    if (member_id) {
      query = query.eq('member_id', member_id);
    }
    
    if (start_date) {
      query = query.gte('payment_date', start_date);
    }
    
    if (end_date) {
      query = query.lte('payment_date', end_date);
    }
    
    // Apply pagination
    const { data, error, count } = await query
      .range(pagination.startIndex, pagination.startIndex + pagination.limit - 1)
      .order('payment_date', { ascending: false });
    
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
 * Get a single payment by ID
 * @route GET /api/payments/:id
 */
const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabaseClient
      .from('payments')
      .select('*, members(id, name)')
      .eq('id', id)
      .single();
    
    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
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
 * Create a new payment
 * @route POST /api/payments
 */
const createPayment = async (req, res, next) => {
  try {
    const { 
      member_id, amount_paid, total_amount, 
      payment_date = new Date().toISOString(), 
      payment_method = 'cash',
      notes 
    } = req.body;
    
    // Check if member exists
    const { data: member, error: memberError } = await supabaseClient
      .from('members')
      .select('id')
      .eq('id', member_id)
      .single();
    
    if (memberError || !member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Calculate due amount
    const due_amount = calculateDueAmount(total_amount, amount_paid);
    
    // Create payment record
    const { data, error } = await supabaseClient
      .from('payments')
      .insert([{ 
        member_id, 
        amount_paid, 
        total_amount, 
        due_amount,
        payment_date,
        payment_method,
        notes
      }])
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
      message: 'Payment recorded successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a payment
 * @route PUT /api/payments/:id
 */
const updatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      amount_paid, 
      total_amount, 
      payment_date,
      payment_method,
      notes 
    } = req.body;
    
    // Check if payment exists
    const { data: existingPayment, error: findError } = await supabaseClient
      .from('payments')
      .select('id')
      .eq('id', id)
      .single();
    
    if (findError || !existingPayment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Calculate due amount
    const due_amount = calculateDueAmount(total_amount, amount_paid);
    
    // Update payment
    const { data, error } = await supabaseClient
      .from('payments')
      .update({ 
        amount_paid, 
        total_amount, 
        due_amount,
        payment_date,
        payment_method,
        notes,
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
      message: 'Payment updated successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a payment
 * @route DELETE /api/payments/:id
 */
const deletePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if payment exists
    const { data: existingPayment, error: findError } = await supabaseClient
      .from('payments')
      .select('id')
      .eq('id', id)
      .single();
    
    if (findError || !existingPayment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Delete payment
    const { error } = await supabaseClient
      .from('payments')
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
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment summary
 * @route GET /api/payments/summary
 */
const getPaymentSummary = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    // Get all payments in the date range
    const { data, error } = await supabaseClient
      .from('payments')
      .select('amount_paid, total_amount, due_amount, payment_date, payment_method')
      .gte('payment_date', start_date)
      .lte('payment_date', end_date);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Calculate summary data
    const totalReceived = data.reduce((sum, payment) => sum + payment.amount_paid, 0);
    const totalDue = data.reduce((sum, payment) => sum + payment.due_amount, 0);
    const totalBilled = data.reduce((sum, payment) => sum + payment.total_amount, 0);
    
    // Calculate payment methods distribution
    const paymentMethods = data.reduce((methods, payment) => {
      const method = payment.payment_method || 'cash';
      methods[method] = (methods[method] || 0) + payment.amount_paid;
      return methods;
    }, {});
    
    // Generate daily revenue data
    const dailyRevenue = data.reduce((days, payment) => {
      const day = payment.payment_date.split('T')[0];
      days[day] = (days[day] || 0) + payment.amount_paid;
      return days;
    }, {});
    
    const summary = {
      period: {
        startDate: start_date,
        endDate: end_date
      },
      totalReceived,
      totalDue,
      totalBilled,
      collectionRate: totalBilled > 0 ? (totalReceived / totalBilled) * 100 : 0,
      paymentMethods,
      dailyRevenue: Object.entries(dailyRevenue).map(([date, amount]) => ({
        date,
        amount
      })).sort((a, b) => a.date.localeCompare(b.date))
    };
    
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payments by member
 * @route GET /api/payments/member/:memberId
 */
const getMemberPayments = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const pagination = getPaginationParams(req);
    
    // Check if member exists
    const { data: member, error: memberError } = await supabaseClient
      .from('members')
      .select('id, name')
      .eq('id', memberId)
      .single();
    
    if (memberError || !member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Get member payments
    const { data, error, count } = await supabaseClient
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('member_id', memberId)
      .range(pagination.startIndex, pagination.startIndex + pagination.limit - 1)
      .order('payment_date', { ascending: false });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Calculate total paid and due
    const totalPaid = data.reduce((sum, payment) => sum + payment.amount_paid, 0);
    const totalDue = data.reduce((sum, payment) => sum + payment.due_amount, 0);
    
    res.status(200).json({
      success: true,
      data: {
        member,
        summary: {
          totalPaid,
          totalDue
        },
        payments: paginatedResponse(data, count, pagination)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentSummary,
  getMemberPayments
};