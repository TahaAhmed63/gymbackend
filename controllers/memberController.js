const { supabaseClient } = require('../config/supabase');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');

/**
 * Get all members with pagination and filtering
 * @route GET /api/members
 */
const getAllMembers = async (req, res, next) => {
  try {
    const { status, search, batch_id } = req.query;
    const pagination = getPaginationParams(req);
    const gym_id = req.user.gym_id;
    console.log(req.user.gym_id,"gym_id")
    // Build query
    let query = supabaseClient  
      .from('members')
      .select(`
        *,
        batches:batch_id(id, name, schedule_time),
        plans:plan_id(id, name, duration_in_months, price)
      `, { count: 'exact' })
      .eq('gym_id', gym_id);
    
    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    
    if (batch_id) {
      query = query.eq('batch_id', batch_id);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    
    // Apply pagination
    const { data, error, count } = await query
      .range(pagination.startIndex, pagination.startIndex + pagination.limit - 1)
      .order('created_at', { ascending: false });
    console.log(data,error,"data erro")
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
 * Get a single member by ID
 * @route GET /api/members/:id
 */
const getMemberById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gym_id = req.user.gym_id;
    
    const { data, error } = await supabaseClient
      .from('members')
      .select(`
        *,
        plan_end_date,
        batches:batch_id(id, name, schedule_time),
        plans:plan_id(id, name, duration_in_months, price)
      `)
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
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
 * Create a new member
 * @route POST /api/members
 */
const createMember = async (req, res, next) => {
  try {
    const { 
      name, phone, email, dob, gender, 
      status = 'active', batch_id, plan_id 
    } = req.body;
    const gym_id = req.user.gym_id;

    // Fetch plan and duration
    const { data: planData, error: planError } = await supabaseClient
      .from('plans')
      .select('id, duration_in_months')  // fetch duration too
      .eq('id', plan_id)
      .eq('gym_id', gym_id)
      .single();

    if (!plan_id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }

    // Verify batch if provided
    if (batch_id) {
      const { data: batchData, error: batchError } = await supabaseClient
        .from('batches')
        .select('id')
        .eq('id', batch_id)
        .eq('gym_id', gym_id)
        .single();

      if (batchError || !batchData) {
        return res.status(400).json({
          success: false,
          message: 'Invalid batch selected'
        });
      }
    }

    const joinDate = new Date();
    const planEndDate = new Date(joinDate);
    planEndDate.setMonth(planEndDate.getMonth() + planData.duration_in_months); // Add months

    const newMember = {
      name,
      phone,
      email,
      dob,
      gender,
      status,
      plan_id,
      gym_id,
      join_date: joinDate.toISOString(),
      plan_end_date: planEndDate.toISOString()  // Add plan end date
    };

    if (batch_id) {
      newMember.batch_id = batch_id;
    }

    const { data, error } = await supabaseClient
      .from('members')
      .insert([newMember])
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
      message: 'Member created successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Update a member
 * @route PUT /api/members/:id
 */
const updateMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email, dob, gender, status, batch_id, plan_id } = req.body;
    const gym_id = req.user.gym_id;
    
    // Check if member exists and belongs to the gym
    const { data: existingMember, error: findError } = await supabaseClient
      .from('members')
      .select('id')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (findError || !existingMember) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Verify new batch and plan belong to the same gym
    if (batch_id) {
      const { data: batchData, error: batchError } = await supabaseClient
        .from('batches')
        .select('id')
        .eq('id', batch_id)
        .eq('gym_id', gym_id)
        .single();
        
      if (batchError || !batchData) {
        return res.status(400).json({
          success: false,
          message: 'Invalid batch selected'
        });
      }
    }
    
    if (plan_id) {
      const { data: planData, error: planError } = await supabaseClient
        .from('plans')
        .select('id')
        .eq('id', plan_id)
        .eq('gym_id', gym_id)
        .single();
        
      if (planError || !planData) {
        return res.status(400).json({
          success: false,
          message: 'Invalid plan selected'
        });
      }
    }
    
    // Update member
    const { data, error } = await supabaseClient
      .from('members')
      .update({
        name,
        phone,
        email,
        dob,
        gender,
        status,
        batch_id,
        plan_id,
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
      message: 'Member updated successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a member
 * @route DELETE /api/members/:id
 */
const deleteMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gym_id = req.user.gym_id;
    
    // Check if member exists and belongs to the gym
    const { data: existingMember, error: findError } = await supabaseClient
      .from('members')
      .select('id')
      .eq('id', id)
      .eq('gym_id', gym_id)
      .single();
    
    if (findError || !existingMember) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Delete member
    const { error } = await supabaseClient
      .from('members')
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
      message: 'Member deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const checkMemberStatus = async (req, res) => {
  try {
    const { gym_id } = req.user;

    // Get all active members
    const { data: members, error: membersError } = await supabaseClient
      .from('members')
      .select(`
        id,
        name,
        status,
        plan_id,
        plan_end_date,
        payments (
          id,
          amount_paid,
          due_amount,
          payment_date
        )
      `)
      .eq('gym_id', gym_id)
      .eq('status', 'active');

    if (membersError) {
      throw membersError;
    }

    const today = new Date();
    const updatedMembers = [];

    for (const member of members) {
      const planEndDate = new Date(member.plan_end_date);
      // Check if plan has expired
      if (planEndDate < today) {
        // Get the latest payment
        const latestPayment = member.payments
          .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0];

        // If there's no payment or the latest payment has dues
        if (!latestPayment || latestPayment.due_amount > 0) {
          // Update member status to inactive
          const { error: updateError } = await supabaseClient
            .from('members')
            .update({ status: 'inactive' })
            .eq('id', member.id);

          if (updateError) {
            console.error(`Error updating member ${member.id}:`, updateError);
            continue;
          }

          updatedMembers.push({
            id: member.id,
            name: member.name,
            reason: 'Plan expired with unpaid dues'
          });
        } else if (latestPayment && latestPayment.due_amount === 0) {
          // Extend plan_end_date by the plan's duration if fully paid
          // Fetch plan duration
          const { data: planData, error: planError } = await supabaseClient
            .from('plans')
            .select('duration_in_months')
            .eq('id', member.plan_id)
            .single();

          if (planData && planData.duration_in_months) {
            const newPlanEndDate = new Date(planEndDate);
            newPlanEndDate.setMonth(newPlanEndDate.getMonth() + planData.duration_in_months);
            const { error: extendError } = await supabaseClient
              .from('members')
              .update({ plan_end_date: newPlanEndDate.toISOString() })
              .eq('id', member.id);
            if (extendError) {
              console.error(`Error extending plan_end_date for member ${member.id}:`, extendError);
              continue;
            }
            updatedMembers.push({
              id: member.id,
              name: member.name,
              reason: 'Plan extended after full payment',
              new_plan_end_date: newPlanEndDate.toISOString()
            });
          }
        }
      }
    }

    res.json({
      success: true,
      message: 'Member status check completed',
      data: {
        updatedMembers,
        totalChecked: members.length,
        totalUpdated: updatedMembers.length
      }
    });
  } catch (error) {
    console.error('Error checking member status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check member status',
      error: error.message
    });
  }
};

module.exports = {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  checkMemberStatus
};