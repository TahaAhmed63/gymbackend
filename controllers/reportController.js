const { supabaseClient } = require('../config/supabase');

/**
 * Get expiring memberships
 * @route GET /api/reports/expiring-memberships
 */
const getExpiringMemberships = async (req, res, next) => {
  try {
    const { days = 15 } = req.query;
    
    // Call the stored function
    const { data, error } = await supabaseClient.rpc('get_expiring_memberships', {
      days_range: parseInt(days)
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Group by expiry range
    const ranges = {
      critical: data.filter(item => item.days_remaining <= 3),
      warning: data.filter(item => item.days_remaining > 3 && item.days_remaining <= 7),
      upcoming: data.filter(item => item.days_remaining > 7)
    };
    
    res.status(200).json({
      success: true,
      data: {
        ranges,
        summary: {
          total: data.length,
          critical: ranges.critical.length,
          warning: ranges.warning.length,
          upcoming: ranges.upcoming.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get upcoming birthdays
 * @route GET /api/reports/birthdays
 */
const getUpcomingBirthdays = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    
    // Call the stored function
    const { data, error } = await supabaseClient.rpc('get_upcoming_birthdays', {
      days_range: parseInt(days)
    });
    
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
 * Get payment status report
 * @route GET /api/reports/payment-status
 */
const getPaymentStatusReport = async (req, res, next) => {
  try {
    // Get all members with their plan and payment information
    const { data: members, error: memberError } = await supabaseClient
      .from('members')
      .select(`
        id,
        name,
        plans:plan_id (
          id,
          name,
          price
        )
      `)
      .eq('status', 'active');
    
    if (memberError) {
      return res.status(400).json({
        success: false,
        message: memberError.message
      });
    }
    
    // Get the last payment for each member
    const memberIds = members.map(member => member.id);
    const { data: payments, error: paymentError } = await supabaseClient
      .from('payments')
      .select('member_id, amount_paid, total_amount, due_amount, payment_date')
      .in('member_id', memberIds)
      .order('payment_date', { ascending: false });
    
    if (paymentError) {
      return res.status(400).json({
        success: false,
        message: paymentError.message
      });
    }
    
    // Group payments by member
    const paymentsByMember = payments.reduce((acc, payment) => {
      if (!acc[payment.member_id]) {
        acc[payment.member_id] = [];
      }
      acc[payment.member_id].push(payment);
      return acc;
    }, {});
    
    // Build the report
    const report = members.map(member => {
      const memberPayments = paymentsByMember[member.id] || [];
      const lastPayment = memberPayments.length > 0 ? memberPayments[0] : null;
      
      return {
        member_id: member.id,
        member_name: member.name,
        plan_name: member.plans?.name || 'No Plan',
        plan_price: member.plans?.price || 0,
        last_payment_date: lastPayment?.payment_date || null,
        due_amount: lastPayment?.due_amount || 0,
        payment_status: !lastPayment ? 'no_payment' :
                        lastPayment.due_amount > 0 ? 'partial' : 'paid'
      };
    });
    
    // Summary statistics
    const summary = {
      total_members: report.length,
      fully_paid: report.filter(item => item.payment_status === 'paid').length,
      partial_payment: report.filter(item => item.payment_status === 'partial').length,
      no_payment: report.filter(item => item.payment_status === 'no_payment').length,
      total_dues: report.reduce((sum, item) => sum + item.due_amount, 0)
    };
    
    res.status(200).json({
      success: true,
      data: {
        summary,
        members: report
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get attendance summary report
 * @route GET /api/reports/attendance-summary
 */
const getAttendanceSummaryReport = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    // Get all active members
    const { data: members, error: memberError } = await supabaseClient
      .from('members')
      .select('id, name, batch_id')
      .eq('status', 'active');
    
    if (memberError) {
      return res.status(400).json({
        success: false,
        message: memberError.message
      });
    }
    
    // Get attendance records for the date range
    const { data: attendance, error: attendanceError } = await supabaseClient
      .from('attendance')
      .select('member_id, date, status')
      .gte('date', start_date)
      .lte('date', end_date)
      .in('member_id', members.map(m => m.id));
    
    if (attendanceError) {
      return res.status(400).json({
        success: false,
        message: attendanceError.message
      });
    }
    
    // Group attendance by member
    const attendanceByMember = attendance.reduce((acc, record) => {
      if (!acc[record.member_id]) {
        acc[record.member_id] = {
          present: 0,
          absent: 0,
          total: 0
        };
      }
      acc[record.member_id][record.status]++;
      acc[record.member_id].total++;
      return acc;
    }, {});
    
    // Build the report
    const report = members.map(member => {
      const memberAttendance = attendanceByMember[member.id] || { present: 0, absent: 0, total: 0 };
      
      return {
        member_id: member.id,
        member_name: member.name,
        batch_id: member.batch_id,
        present_count: memberAttendance.present,
        absent_count: memberAttendance.absent,
        total_records: memberAttendance.total,
        attendance_percentage: memberAttendance.total > 0 
          ? (memberAttendance.present / memberAttendance.total) * 100 
          : 0
      };
    });
    
    // Summary statistics
    const summary = {
      date_range: {
        start_date,
        end_date
      },
      total_members: members.length,
      overall_attendance_percentage: 
        attendance.length > 0 
          ? (attendance.filter(a => a.status === 'present').length / attendance.length) * 100 
          : 0,
      members_with_perfect_attendance: report.filter(r => r.attendance_percentage === 100 && r.total_records > 0).length,
      members_with_low_attendance: report.filter(r => r.attendance_percentage < 50 && r.total_records > 0).length,
      members_with_no_attendance: report.filter(r => r.total_records === 0).length
    };
    
    res.status(200).json({
      success: true,
      data: {
        summary,
        members: report
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get financial summary report
 * @route GET /api/reports/financial-summary
 */
const getFinancialSummaryReport = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    // Get payments for the date range
    const { data: payments, error: paymentError } = await supabaseClient
      .from('payments')
      .select('id, amount_paid, payment_date, payment_method')
      .gte('payment_date', start_date)
      .lte('payment_date', end_date);
    
    if (paymentError) {
      return res.status(400).json({
        success: false,
        message: paymentError.message
      });
    }
    
    // Get expenses for the date range
    const { data: expenses, error: expenseError } = await supabaseClient
      .from('expenses')
      .select('id, amount, date')
      .gte('date', start_date)
      .lte('date', end_date);
    
    if (expenseError) {
      return res.status(400).json({
        success: false,
        message: expenseError.message
      });
    }
    
    // Calculate financial metrics
    const totalRevenue = payments.reduce((sum, payment) => sum + parseFloat(payment.amount_paid), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const netProfit = totalRevenue - totalExpenses;
    
    // Group payments by method
    const paymentMethods = payments.reduce((acc, payment) => {
      const method = payment.payment_method || 'cash';
      if (!acc[method]) {
        acc[method] = 0;
      }
      acc[method] += parseFloat(payment.amount_paid);
      return acc;
    }, {});
    
    // Group by date for chart data
    const revenueByDate = payments.reduce((acc, payment) => {
      const date = payment.payment_date;
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += parseFloat(payment.amount_paid);
      return acc;
    }, {});
    
    const expensesByDate = expenses.reduce((acc, expense) => {
      const date = expense.date;
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += parseFloat(expense.amount);
      return acc;
    }, {});
    
    // Combine dates for chart
    const allDates = [...new Set([...Object.keys(revenueByDate), ...Object.keys(expensesByDate)])].sort();
    
    const chartData = allDates.map(date => ({
      date,
      revenue: revenueByDate[date] || 0,
      expenses: expensesByDate[date] || 0,
      profit: (revenueByDate[date] || 0) - (expensesByDate[date] || 0)
    }));
    
    res.status(200).json({
      success: true,
      data: {
        summary: {
          total_revenue: totalRevenue,
          total_expenses: totalExpenses,
          net_profit: netProfit,
          profit_margin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
          date_range: {
            start_date,
            end_date
          }
        },
        payment_methods: Object.entries(paymentMethods).map(([method, amount]) => ({
          method,
          amount,
          percentage: (amount / totalRevenue) * 100
        })),
        chart_data: chartData
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExpiringMemberships,
  getUpcomingBirthdays,
  getPaymentStatusReport,
  getAttendanceSummaryReport,
  getFinancialSummaryReport
};