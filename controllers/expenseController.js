const { supabaseClient } = require('../config/supabase');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');

/**
 * Get all expenses with pagination and filtering
 * @route GET /api/expenses
 */
const getAllExpenses = async (req, res, next) => {
  try {
    const { start_date, end_date, search } = req.query;
    const pagination = getPaginationParams(req);
    const gym_id = req.user.gym_id;
    
    // Build query
    let query = supabaseClient
      .from('expenses')
      .select('*', { count: 'exact' })
      .eq('gym_id', gym_id);
    
    // Apply filters
    if (start_date) {
      query = query.gte('date', start_date);
    }
    
    if (end_date) {
      query = query.lte('date', end_date);
    }
    
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    
    // Apply pagination
    const { data, error, count } = await query
      .range(pagination.startIndex, pagination.startIndex + pagination.limit - 1)
      .order('date', { ascending: false });
    
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
 * Get a single expense by ID
 * @route GET /api/expenses/:id
 */
const getExpenseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gym_id = req.user.gym_id;
    
    const { data, error } = await supabaseClient
      .from('expenses')
      .select('*')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
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
 * Create a new expense
 * @route POST /api/expenses
 */
const createExpense = async (req, res, next) => {
  try {
    const { title, amount, date = new Date().toISOString(), notes } = req.body;
    const gym_id = req.user.gym_id;
    
    const { data, error } = await supabaseClient
      .from('expenses')
      .insert([{ title, amount, date, notes, gym_id }])
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
      message: 'Expense created successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an expense
 * @route PUT /api/expenses/:id
 */
const updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, amount, date, notes } = req.body;
    const gym_id = req.user.gym_id;
    
    // Check if expense exists and belongs to the gym
    const { data: existingExpense, error: findError } = await supabaseClient
      .from('expenses')
      .select('id')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (findError || !existingExpense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }
    
    // Update expense
    const { data, error } = await supabaseClient
      .from('expenses')
      .update({ 
        title, 
        amount, 
        date, 
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
      message: 'Expense updated successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an expense
 * @route DELETE /api/expenses/:id
 */
const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gym_id = req.user.gym_id;
    
    // Check if expense exists and belongs to the gym
    const { data: existingExpense, error: findError } = await supabaseClient
      .from('expenses')
      .select('id')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (findError || !existingExpense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }
    
    // Delete expense
    const { error } = await supabaseClient
      .from('expenses')
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
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get expense summary
 * @route GET /api/expenses/summary
 */
const getExpenseSummary = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const gym_id = req.user.gym_id;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    // Get expenses for the period
    const { data, error } = await supabaseClient
      .from('expenses')
      .select('*')
      .eq('gym_id', gym_id)
      .gte('date', start_date)
      .lte('date', end_date)
      .order('date', { ascending: true });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Calculate total expenses
    const totalExpenses = data.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    
    // Group expenses by date for chart data
    const expensesByDate = data.reduce((acc, expense) => {
      const date = expense.date;
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += parseFloat(expense.amount);
      return acc;
    }, {});
    
    // Group expenses by category
    const expensesByCategory = data.reduce((acc, expense) => {
      const category = expense.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += parseFloat(expense.amount);
      return acc;
    }, {});
    
    res.status(200).json({
      success: true,
      data: {
        period: {
          startDate: start_date,
          endDate: end_date
        },
        totalExpenses,
        expensesByDate: Object.entries(expensesByDate).map(([date, amount]) => ({
          date,
          amount
        })),
        expensesByCategory: Object.entries(expensesByCategory).map(([category, amount]) => ({
          category,
          amount
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary
};