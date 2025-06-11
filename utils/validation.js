const { z } = require('zod');

// Custom error handler for Zod validation
const handleZodError = (error) => {
  const errors = error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
  return {
    status: 'error',
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    errors,
  };
};

// Validation middleware
const validate = (schema) => async (req, res, next) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(handleZodError(error));
  }
    next(error);
  }
};

// Auth validation schemas
const userValidation = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().optional(),
  }),
});

const loginValidation = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

// Member validation schemas
const memberValidation = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email format'),
    phone: z.string().min(10, 'Phone number must be at least 10 digits'),
    address: z.string().optional(),
    emergencyContact: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
  }),
});

// Batch validation schemas
const batchValidation = z.object({
  body: z.object({
    name: z.string().min(2, 'Batch name must be at least 2 characters'),
    startTime: z.string(),
    endTime: z.string(),
    capacity: z.number().min(1, 'Capacity must be at least 1'),
    trainerId: z.string().uuid('Invalid trainer ID'),
  }),
});

// Payment validation schemas
const paymentValidation = z.object({
  body: z.object({
    member_id: z.string().uuid('Invalid member ID'),
    amount_paid: z.number().positive('Amount paid must be positive'),
    total_amount: z.number().positive('Total amount must be positive'),
    payment_date: z.string(),
    payment_method: z.enum(['cash', 'card', 'upi']),
    notes: z.string().optional(),
  }),
});

// Attendance validation schemas
const attendanceValidation = z.object({
  body: z.object({
    member_id: z.string().uuid('Invalid member ID'),
    batch_id: z.string().uuid('Invalid batch ID'),
    date: z.string(),
    status: z.enum(['present', 'absent', 'late']),
  }),
});

// OTP verification validation schema
const otpVerificationValidation = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    otp: z.string().min(4, 'OTP must be at least 4 digits'),
  }),
});

module.exports = {
  validate,
  userValidation,
  loginValidation,
  memberValidation,
  batchValidation,
  paymentValidation,
  attendanceValidation,
  otpVerificationValidation,
};