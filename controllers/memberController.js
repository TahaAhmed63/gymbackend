const { supabaseClient, supabaseAdmin } = require('../config/supabase');
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
    // Build query
    let query = supabaseClient  
      .from('members')
      .select(`
        *,
        batches:batch_id(id, name, schedule_time),
        plans:plan_id(id, name, duration_in_months, price),
        discount_value,
        admission_fees,
        status,
        plan_end_date,
        payments(id, amount_paid, due_amount, payment_date, notes)
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
        plans:plan_id(id, name, duration_in_months, price),
        discount_value,
        admission_fees
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
 * Accepts a profile photo URL or base64 string as 'photo' in the request body.
 */
const createMember = async (req, res, next) => {
  try {
    const { 
      name, phone, email, dob, gender, 
      status = 'active', batch_id, plan_id, joinDate, photo, discount_value, admission_fees, amount_paid // photo from frontend
    } = req.body;
    const gym_id = req.user.gym_id;

    // Fetch plan and duration
    const { data: planData, error: planError } = await supabaseClient
      .from('plans')
      .select('id, duration_in_months')
      .eq('id', plan_id)
      .eq('gym_id', gym_id)
      .single();

    if (!plan_id || planError || !planData) {
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

    const planEndDate = new Date(joinDate);
    planEndDate.setMonth(planEndDate.getMonth() + planData.duration_in_months);

    const newMember = {
      name,
      phone,
      email,
      dob,
      gender,
      status,
      plan_id,
      gym_id,
      join_date: new Date(joinDate).toISOString(), // Convert to Date object before calling toISOString()
      plan_end_date: planEndDate.toISOString(),
      discount_value,
      admission_fees
    };

    if (batch_id) {
      newMember.batch_id = batch_id;
    }

    // Handle photo upload if provided
    if (photo) {
      try {
        // Assuming photo is a base64 string from the frontend
        const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const fileExtension = photo.substring('data:image/'.length, photo.indexOf(';base64'));
        const fileName = `member-${Date.now()}.${fileExtension}`;
        const filePath = `avatars/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('member-photos') // Use your desired bucket name here
          .upload(filePath, imageBuffer, {
            contentType: `image/${fileExtension}`,
            upsert: false // Set to true if you want to overwrite existing files with the same name
          });

        if (uploadError) {
          console.error('Supabase Storage Upload Error:', uploadError);
          return res.status(500).json({
            success: false,
            message: 'Failed to upload photo: ' + uploadError.message
          });
        }

        // Get public URL
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('member-photos')
          .getPublicUrl(filePath);

        newMember.photo = publicUrlData.publicUrl;

      } catch (uploadProcessError) {
        console.error('Photo processing or upload error:', uploadProcessError);
        return res.status(500).json({
          success: false,
          message: 'Error processing photo for upload: ' + uploadProcessError.message
        });
      }
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

    // If admission_fees are provided, create a payment record for it
    if (admission_fees && admission_fees > 0) {
      // Fetch plan price
      let plan_price = 0;
      if (plan_id) {
        const { data: planObj } = await supabaseClient
          .from('plans')
          .select('price')
          .eq('id', plan_id)
          .eq('gym_id', gym_id)
          .single();
        plan_price = planObj?.price || 0;
      }
      const paid = typeof amount_paid === 'number' ? amount_paid : 0;
      const discount = typeof discount_value === 'number' ? discount_value : 0;
      const total = admission_fees + plan_price - discount;
      const due = total - paid;
      const admissionPayment = {
        member_id: data.id, // Use the newly created member's ID
        amount_paid: paid,
        total_amount: total,
        due_amount: due > 0 ? due : 0,
        payment_date: new Date().toISOString(),
        payment_method: 'cash', // Default or could be passed from frontend
        notes: 'Admission Fee',
        gym_id,
      };

      const { error: paymentError } = await supabaseClient
        .from('payments')
        .insert([admissionPayment]);

      if (paymentError) {
        console.error('Error recording admission fee payment:', paymentError);
        // Optionally, you might want to revert member creation or notify admin
      }
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
 * Accepts a profile photo URL or base64 string as 'photo' in the request body.
 */
const updateMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email, dob, gender, status, batch_id, plan_id, photo, joinDate, discount_value, admission_fees, amount_paid } = req.body;
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
    
    let planData = null;
    if (plan_id) {
      const { data: planDataFetched, error: planError } = await supabaseClient
        .from('plans')
        .select('id, duration_in_months')
        .eq('id', plan_id)
        .eq('gym_id', gym_id)
        .single();
        
      if (planError || !planDataFetched) {
        return res.status(400).json({
          success: false,
          message: 'Invalid plan selected'
        });
      }
      planData = planDataFetched;
    }

    // Only calculate planEndDate if joinDate and planData are available
    let planEndDate = null;
    if (joinDate && planData && planData.duration_in_months !== undefined) {
      planEndDate = new Date(joinDate);
      planEndDate.setMonth(planEndDate.getMonth() + planData.duration_in_months);
    }

    // Build update object, including photo if provided
    const updateObj = {
      name,
      phone,
      email,
      dob,
      gender,
      status,
      batch_id,
      plan_id,
      updated_at: new Date().toISOString(),
      discount_value,
      admission_fees,
      // amount_paid
    };

    if (joinDate) {
      updateObj.join_date = new Date(joinDate).toISOString();
    }
    if (planEndDate) {
      updateObj.plan_end_date = planEndDate.toISOString();
    }
    if (photo !== undefined) {
      updateObj.photo = photo;
    }
    // Update member
    const { data, error } = await supabaseClient
      .from('members')
      .update(updateObj)
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
    // If admission/plan/discount/amount_paid changed, update payment record
    if (admission_fees && plan_id && amount_paid) {
      // Fetch plan price
      let plan_price = 0;
      const { data: planObj } = await supabaseClient
        .from('plans')
        .select('price')
        .eq('id', plan_id)
        .eq('gym_id', gym_id)
        .single();
      plan_price = planObj?.price || 0;
      const paid = typeof amount_paid === 'number' ? amount_paid : 0;
      const discount = typeof discount_value === 'number' ? discount_value : 0;
      const total = admission_fees + plan_price - discount;
      const due = total - paid;
      // Find the existing admission fee payment
      const { data: paymentRecord } = await supabaseClient
        .from('payments')
        .select('id')
        .eq('member_id', id)
        .eq('notes', 'Admission Fee')
        .single();
      if (paymentRecord) {
        // Update payment
        await supabaseClient
          .from('payments')
          .update({
            amount_paid: paid,
            total_amount: total,
            due_amount: due > 0 ? due : 0
          })
          .eq('id', paymentRecord.id);
      } else {
        // Insert if not exists
        await supabaseClient
          .from('payments')
          .insert([{
            member_id: id,
            amount_paid: paid,
            total_amount: total,
            due_amount: due > 0 ? due : 0,
            payment_date: new Date().toISOString(),
            payment_method: 'cash',
            notes: 'Admission Fee',
            gym_id
          }]);
      }
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

    // Get all members (not just active)
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
          payment_date,
          notes
        )
      `)
      .eq('gym_id', gym_id);

    if (membersError) {
      throw membersError;
    }

    const today = new Date();
    const updatedMembers = [];

    for (const member of members) {
      const planEndDate = new Date(member.plan_end_date);
      // Filter out only plan-related payments (not Admission Fee)
      const planPayments = (member.payments || []).filter(p => p.notes !== 'Admission Fee');
      // Get the latest plan payment
      const latestPayment = planPayments
        .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];

      // If plan has expired
      if (planEndDate < today) {
        // If no plan payment or latest plan payment has dues, set to inactive if not already
        if (!latestPayment || latestPayment.due_amount > 0) {
          if (member.status !== 'inactive') {
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
              reason: 'Plan expired with unpaid dues, set to inactive'
            });
          }
        } else if (latestPayment && latestPayment.due_amount === 0) {
          // If fully paid, extend plan_end_date and set to active if not already
          // Fetch plan duration
          const { data: planData, error: planError } = await supabaseClient
            .from('plans')
            .select('duration_in_months')
            .eq('id', member.plan_id)
            .single();

          if (planError) {
            console.error(`Error fetching plan for member ${member.id}:`, planError);
            continue;
          }

          if (planData && planData.duration_in_months) {
            const newPlanEndDate = new Date(planEndDate);
            newPlanEndDate.setMonth(newPlanEndDate.getMonth() + planData.duration_in_months);

            const { error: extendError } = await supabaseClient
              .from('members')
              .update({ 
                plan_end_date: newPlanEndDate.toISOString(),
                status: 'active'
              })
              .eq('id', member.id);

            if (extendError) {
              console.error(`Error extending plan_end_date for member ${member.id}:`, extendError);
              continue;
            }

            updatedMembers.push({
              id: member.id,
              name: member.name,
              reason: 'Plan extended after full payment, set to active',
              new_plan_end_date: newPlanEndDate.toISOString()
            });
          }
        }
      } else {
        // Plan is still valid, check if member is inactive but has paid all dues
        if (member.status === 'inactive') {
          // If latest plan payment exists and has no dues, set to active
          if (latestPayment && latestPayment.due_amount === 0) {
            const { error: reactivateError } = await supabaseClient
              .from('members')
              .update({ status: 'active' })
              .eq('id', member.id);

            if (reactivateError) {
              console.error(`Error reactivating member ${member.id}:`, reactivateError);
              continue;
            }

            updatedMembers.push({
              id: member.id,
              name: member.name,
              reason: 'All dues paid and plan valid, set to active'
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