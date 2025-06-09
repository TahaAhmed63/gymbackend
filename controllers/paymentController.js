const { supabaseClient } = require('../config/supabase');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');
const { calculateDueAmount } = require('../utils/helpers');
const ExcelJS = require('exceljs');

/**
 * Get all payments with pagination and filtering
 * @route GET /api/payments
 */
const getAllPayments = async (req, res, next) => {
  try {
    const { member_id, start_date, end_date } = req.query;
    const pagination = getPaginationParams(req);
    const gym_id = req.user.gym_id;
    console.log(gym_id,"gym_id")
    // Build query
    let query = supabaseClient
      .from('payments')
      .select(`
        *,
        members!inner(id, name, phone)
      `, { count: 'exact' })
      .eq('gym_id', gym_id);
    
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
    const gym_id = req.user.gym_id;
    
    const { data, error } = await supabaseClient
      .from('payments')
      .select(`
        *,
        members!inner(id, name, phone)
      `)
      .eq('id', id)
      .eq('gym_id', gym_id)
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
    const gym_id = req.user.gym_id;
    
    // Check if member exists and belongs to the gym
    const { data: member, error: memberError } = await supabaseClient
      .from('members')
      .select('id')
      .eq('id', member_id)
      .eq('gym_id', gym_id)
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
        notes,
        gym_id
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
    const gym_id = req.user.gym_id;
    
    // Check if payment exists and belongs to the gym
    const { data: existingPayment, error: findError } = await supabaseClient
      .from('payments')
      .select('id')
      .eq('id', id)
      .eq('gym_id', gym_id)
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
    const gym_id = req.user.gym_id;
    
    // Check if payment exists and belongs to the gym
    const { data: existingPayment, error: findError } = await supabaseClient
      .from('payments')
      .select('id')
      .eq('id', id)
      .eq('gym_id', gym_id)
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
    const gym_id = req.user.gym_id;
    
    // Build query
    let query = supabaseClient
      .from('payments')
      .select(`
        total_amount,
        amount_paid,
        due_amount
      `)
      .eq('gym_id', gym_id);
    
    // Apply date filters
    if (start_date) {
      query = query.gte('payment_date', start_date);
    }
    
    if (end_date) {
      query = query.lte('payment_date', end_date);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Calculate summary
    const summary = data.reduce((acc, payment) => {
      acc.total_amount += Number(payment.total_amount) || 0;
      acc.amount_paid += Number(payment.amount_paid) || 0;
      acc.due_amount += Number(payment.due_amount) || 0;
      return acc;
    }, { total_amount: 0, amount_paid: 0, due_amount: 0 });
    
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get member payments
 * @route GET /api/payments/member/:memberId
 */
const getMemberPayments = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const pagination = getPaginationParams(req);
    const gym_id = req.user.gym_id;
    console.log(memberId,"memberId")
    // Check if member exists and belongs to the gym
    const { data: member, error: memberError } = await supabaseClient
      .from('members')
      .select('id')
      .eq('id', memberId)
      .eq('gym_id', gym_id)
      .single();
    console.log(memberError)
    if (memberError || !member) {
      console.log(memberError)
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Get member's payments
    const { data, error, count } = await supabaseClient
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('member_id', memberId)
      .eq('gym_id', gym_id)
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
 * Export payments to Excel
 * @route GET /api/payments/export
 */
const exportPaymentsToExcel = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const gym_id = req.user.gym_id;
    
    // Build query
    let query = supabaseClient
      .from('payments')
      .select(`
        *,
        members!inner(id, name, phone)
      `)
      .eq('gym_id', gym_id);
    
    // Apply date filters
    if (start_date) {
      query = query.gte('payment_date', start_date);
    }
    
    if (end_date) {
      query = query.lte('payment_date', end_date);
    }
    
    const { data: payments, error } = await query.order('payment_date', { ascending: false });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payments');
    
    // Add headers
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Member Name', key: 'memberName', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Amount Paid', key: 'amountPaid', width: 15 },
      { header: 'Due Amount', key: 'dueAmount', width: 15 },
      { header: 'Payment Method', key: 'paymentMethod', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];
    
    // Add rows
    payments.forEach(payment => {
      worksheet.addRow({
        date: new Date(payment.payment_date).toLocaleDateString(),
        memberName: payment.members.name,
        phone: payment.members.phone,
        totalAmount: payment.total_amount,
        amountPaid: payment.amount_paid,
        dueAmount: payment.due_amount,
        paymentMethod: payment.payment_method,
        status: payment.status,
        notes: payment.notes
      });
    });
    
    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=payments.xlsx');
    
    // Write to response
    await workbook.xlsx.write(res);
    res.end();
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
  getMemberPayments,
  exportPaymentsToExcel
};