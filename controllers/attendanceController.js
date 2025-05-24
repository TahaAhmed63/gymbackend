const { supabaseClient } = require('../config/supabase');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');
const { formatDate } = require('../utils/helpers');

/**
 * Get attendance records with pagination and filtering
 * @route GET /api/attendance
 */
const getAttendance = async (req, res, next) => {
  try {
    const { member_id, date, batch_id, status } = req.query;
    const pagination = getPaginationParams(req);
    const gym_id = req.user.gym_id;
    
    // Build query
    let query = supabaseClient
      .from('attendance')
      .select(`
        *,
        members!inner(id, name, batch_id)
      `, { count: 'exact' })
      .eq('gym_id', gym_id);
    
    // Apply filters
    if (member_id) {
      query = query.eq('member_id', member_id);
    }
    
    if (date) {
      query = query.eq('date', date);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (batch_id) {
      query = query.eq('members.batch_id', batch_id);
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
 * Record attendance for a member
 * @route POST /api/attendance
 */
const recordAttendance = async (req, res, next) => {
  try {
    const { member_id, date, status } = req.body;
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
    
    // Check if attendance already recorded for the date
    const { data: existingAttendance, error: attendanceError } = await supabaseClient
      .from('attendance')
      .select('id')
      .eq('member_id', member_id)
      .eq('date', date)
      .eq('gym_id', gym_id)
      .single();
    
    if (existingAttendance) {
      // Update existing attendance
      const { data, error } = await supabaseClient
        .from('attendance')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', existingAttendance.id)
        .eq('gym_id', gym_id)
        .select()
        .single();
      
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Attendance updated successfully',
        data
      });
    }
    
    // Create new attendance record
    const { data, error } = await supabaseClient
      .from('attendance')
      .insert([{ member_id, date, status, gym_id }])
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
      message: 'Attendance recorded successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record batch attendance
 * @route POST /api/attendance/batch
 */
const recordBatchAttendance = async (req, res, next) => {
  try {
    const { batch_id, date, attendanceData } = req.body;
    const gym_id = req.user.gym_id;
    
    // Check if batch exists and belongs to the gym
    const { data: batch, error: batchError } = await supabaseClient
      .from('batches')
      .select('id')
      .eq('id', batch_id)
      .eq('gym_id', gym_id)
      .single();
    
    if (batchError || !batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }
    
    // Get all members in the batch
    const { data: batchMembers, error: membersError } = await supabaseClient
      .from('members')
      .select('id')
      .eq('batch_id', batch_id)
      .eq('gym_id', gym_id)
      .eq('status', 'active');
    
    if (membersError) {
      return res.status(400).json({
        success: false,
        message: membersError.message
      });
    }
    
    // Prepare attendance records
    const attendanceRecords = attendanceData.map(item => ({
      member_id: item.member_id,
      date,
      status: item.status,
      gym_id
    }));
    
    // Insert or update attendance records
    const { data, error } = await supabaseClient
      .from('attendance')
      .upsert(attendanceRecords, { 
        onConflict: 'member_id,date',
        returning: 'minimal'
      });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Batch attendance recorded successfully',
      data: { 
        date,
        batch_id,
        recordCount: attendanceRecords.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get attendance report for a specific period
 * @route GET /api/attendance/report
 */
const getAttendanceReport = async (req, res, next) => {
  try {
    const { member_id, start_date, end_date } = req.query;
    const gym_id = req.user.gym_id;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    // Build query
    let query = supabaseClient
      .from('attendance')
      .select(`
        *,
        members!inner(id, name)
      `)
      .eq('gym_id', gym_id);
    
    // Apply filters
    if (member_id) {
      query = query.eq('member_id', member_id);
    }
    
    query = query
      .gte('date', start_date)
      .lte('date', end_date)
      .order('date', { ascending: true });
    
    const { data, error } = await query;
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Process data for report
    const reportData = {
      period: {
        startDate: start_date,
        endDate: end_date
      },
      totalDays: Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)) + 1,
      attendance: {
        present: data.filter(record => record.status === 'present').length,
        absent: data.filter(record => record.status === 'absent').length,
        late: data.filter(record => record.status === 'late').length
      },
      dailyAttendance: data.reduce((acc, record) => {
        const date = formatDate(record.date);
        if (!acc[date]) {
          acc[date] = {
            present: 0,
            absent: 0,
            late: 0
          };
        }
        acc[date][record.status]++;
        return acc;
      }, {})
    };
    
    res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAttendance,
  recordAttendance,
  recordBatchAttendance,
  getAttendanceReport
};