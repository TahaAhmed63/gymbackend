const { supabaseClient } = require('../config/supabase');
const moment = require('moment');
const { Parser } = require('json2csv');

/**
 * Get expiring memberships
 * @route GET /api/reports/expiring-memberships
 */
const getExpiringMembers = async (req, res) => {
  try {
    const { timeframe } = req.query;
    let days;
    
    // Convert timeframe to days
    switch (timeframe) {
      case '3days':
        days = { start: 1, end: 3 };
        break;
      case '7days':
        days = { start: 4, end: 7 };
        break;
      case '15days':
        days = { start: 8, end: 15 };
        break;
      case '30days':
        days = { start: 16, end: 30 };
        break;
      default:
        days = { start: 1, end: 3 };
    }
    
    const today = moment().startOf('day');
    const endDate = moment().add(days.end, 'days').endOf('day');
    const startDate = moment().add(days.start - 1, 'days').startOf('day');
    
    const { data: members, error } = await supabaseClient
      .from('members')
      .select(`
        *,
        plans:plan_id (
          id,
          name,
          price
        )
      `)
      .eq('status', 'active')
      .gte('plan_end_date', startDate.toISOString())
      .lte('plan_end_date', endDate.toISOString())
      .order('plan_end_date', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    // Calculate days remaining for each member
    const membersWithDaysRemaining = members.map(member => {
      const daysRemaining = moment(member.plan_end_date).diff(today, 'days');
      return {
        ...member,
        days_remaining: daysRemaining
      };
    });
    
    res.json(membersWithDaysRemaining);
  } catch (error) {
    console.error('Error fetching expiring members:', error);
    res.status(500).json({ error: 'Failed to fetch expiring members' });
  }
};

/**
 * Get upcoming birthdays
 * @route GET /api/reports/birthdays
 */
const getBirthdayMembers = async (req, res) => {
  try {
    const today = moment();
    const thirtyDaysFromNow = moment().add(30, 'days');
    
    const { data: members, error } = await supabaseClient
      .from('members')
      .select(`
        *,
        plans:plan_id (
          id,
          name,
          price
        )
      `)
      .eq('status', 'active')
      .not('dob', 'is', null);
    
    if (error) {
      throw error;
    }
    
    // Filter and calculate days until birthday
    const upcomingBirthdays = members
      .map(member => {
        const birthday = moment(member.dob);
        const nextBirthday = moment(birthday).year(today.year());
        
        // If birthday has passed this year, get next year's birthday
        if (nextBirthday.isBefore(today)) {
          nextBirthday.add(1, 'year');
        }
        
        const daysUntilBirthday = nextBirthday.diff(today, 'days');
        
        return {
          ...member,
          days_until_birthday: daysUntilBirthday
        };
      })
      .filter(member => member.days_until_birthday <= 30)
      .sort((a, b) => a.days_until_birthday - b.days_until_birthday);
    
    res.json(upcomingBirthdays);
  } catch (error) {
    console.error('Error fetching birthday members:', error);
    res.status(500).json({ error: 'Failed to fetch birthday members' });
  }
};

/**
 * Get payment status report
 * @route GET /api/reports/payment-status
 */
const getPaymentStatusReport = async (req, res, next) => {
  try {
    const gym_id = req.user.gym_id;
    
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
      .eq('status', 'active')
      .eq('gym_id', gym_id);
    
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
      .eq('gym_id', gym_id)
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
    console.log(report)
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
    const gym_id = req.user.gym_id;
    
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
      .eq('status', 'active')
      .eq('gym_id', gym_id);
    
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
      .eq('gym_id', gym_id)
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
      members_with_poor_attendance: report.filter(r => r.attendance_percentage < 50 && r.total_records > 0).length
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
    const gym_id = req.user.gym_id;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    // Get payments for the period
    const { data: payments, error: paymentError } = await supabaseClient
      .from('payments')
      .select('amount_paid, total_amount, due_amount, payment_date, payment_method')
      .eq('gym_id', gym_id)
      .gte('payment_date', start_date)
      .lte('payment_date', end_date);
    
    if (paymentError) {
      return res.status(400).json({
        success: false,
        message: paymentError.message
      });
    }
    
    // Get expenses for the period
    const { data: expenses, error: expenseError } = await supabaseClient
      .from('expenses')
      .select('amount, date, category')
      .eq('gym_id', gym_id)
      .gte('date', start_date)
      .lte('date', end_date);
    
    if (expenseError) {
      return res.status(400).json({
        success: false,
        message: expenseError.message
      });
    }
    
    // Calculate payment statistics
    const paymentStats = payments.reduce((acc, payment) => {
      acc.total_received += Number(payment.amount_paid) || 0;
      acc.total_billed += Number(payment.total_amount) || 0;
      acc.total_due += Number(payment.due_amount) || 0;
      
      // Group by payment method
      const method = payment.payment_method || 'cash';
      if (!acc.payment_methods[method]) {
        acc.payment_methods[method] = 0;
      }
      acc.payment_methods[method] += Number(payment.amount_paid) || 0;
      
      return acc;
    }, { 
      total_received: 0, 
      total_billed: 0, 
      total_due: 0,
      payment_methods: {}
    });
    
    // Calculate expense statistics
    const expenseStats = expenses.reduce((acc, expense) => {
      acc.total_expenses += Number(expense.amount) || 0;
      
      // Group by category
      const category = expense.category || 'Uncategorized';
      if (!acc.categories[category]) {
        acc.categories[category] = 0;
      }
      acc.categories[category] += Number(expense.amount) || 0;
      
      return acc;
    }, { 
      total_expenses: 0,
      categories: {}
    });
    
    // Calculate net profit
    const net_profit = paymentStats.total_received - expenseStats.total_expenses;
    
    res.status(200).json({
      success: true,
      data: {
        period: {
          start_date,
          end_date
        },
        revenue: {
          total_received: paymentStats.total_received,
          total_billed: paymentStats.total_billed,
          total_due: paymentStats.total_due,
          payment_methods: Object.entries(paymentStats.payment_methods).map(([method, amount]) => ({
            method,
            amount
          }))
        },
        expenses: {
          total: expenseStats.total_expenses,
          categories: Object.entries(expenseStats.categories).map(([category, amount]) => ({
            category,
            amount
          }))
        },
        summary: {
          net_profit,
          collection_rate: paymentStats.total_billed > 0 
            ? (paymentStats.total_received / paymentStats.total_billed) * 100 
            : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Download reports
const downloadReport = async (req, res) => {
  try {
    const { type } = req.params;
    // 1. Fetch members (active/inactive as needed)
    let query = supabaseClient
      .from('members')
      .select(`
        *,
        plans:plan_id (
          id,
          name,
          price
        )
      `);

    if (type === 'active') query = query.eq('status', 'active');
    if (type === 'inactive') query = query.eq('status', 'inactive');
    // Do NOT filter by payment_status here

    const { data: members, error } = await query;
    if (error) throw error;

    // 2. Fetch payments for these members
    const memberIds = members.map(m => m.id);
    let payments = [];
    if (memberIds.length > 0) {
      const { data: paymentsData, error: paymentError } = await supabaseClient
        .from('payments')
        .select('member_id, due_amount, payment_date')
        .in('member_id', memberIds)
        .order('payment_date', { ascending: false });
      if (paymentError) throw paymentError;
      payments = paymentsData;
    }

    // 3. Group payments by member
    const paymentsByMember = payments.reduce((acc, payment) => {
      if (!acc[payment.member_id]) acc[payment.member_id] = [];
      acc[payment.member_id].push(payment);
      return acc;
    }, {});

    // 4. Compute payment status for each member
    const membersWithStatus = members.map(member => {
      const memberPayments = paymentsByMember[member.id] || [];
      const lastPayment = memberPayments.length > 0 ? memberPayments[0] : null;
      let payment_status = 'no_payment';
      if (lastPayment) {
        payment_status = lastPayment.due_amount > 0 ? 'partial' : 'paid';
      }
      return { ...member, payment_status };
    });

    // 5. Filter by type if needed
    let filteredMembers = membersWithStatus;
    if (type === 'partial') {
      filteredMembers = membersWithStatus.filter(m => m.payment_status === 'partial');
    }

    // 6. Prepare data for CSV (same as before)
    const fields = [
      'id',
      'name',
      'phone',
      'email',
      'dob',
      'status',
      'plan_end_date',
      'payment_status',
      'plan_name',
      'plan_price'
    ];
    
    const data = filteredMembers.map(member => ({
      id: member.id,
      name: member.name,
      phone: member.phone,
      email: member.email,
      dob: member.dob,
      status: member.status,
      plan_end_date: member.plan_end_date,
      payment_status: member.payment_status,
      plan_name: member.plans?.name || '',
      plan_price: member.plans?.price || 0
    }));
    
    // Convert to CSV
    const csv = fields.join(',') + '\n' +
      data.map(row => 
        fields.map(field => {
          const value = row[field];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      ).join('\n');
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_members_report.csv`);
    
    res.send(csv);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

module.exports = {
  getExpiringMembers,
  getBirthdayMembers,
  getPaymentStatusReport,
  getAttendanceSummaryReport,
  getFinancialSummaryReport,
  downloadReport
};