/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the full error for debugging
  console.error('Error details:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode
  });

  // Default error response
  const errorResponse = {
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message || 'Internal Server Error',
    code: 'INTERNAL_SERVER_ERROR'
  };

  // Handle different types of errors
  if (err.name === 'ValidationError') {
    errorResponse.status = 'error';
    errorResponse.code = 'VALIDATION_ERROR';
    errorResponse.message = 'Validation Error';
    errorResponse.errors = err.errors;
    return res.status(400).json(errorResponse);
  }

  if (err.name === 'UnauthorizedError') {
    errorResponse.status = 'error';
    errorResponse.code = 'UNAUTHORIZED';
    errorResponse.message = 'Unauthorized access';
    return res.status(401).json(errorResponse);
  }

  if (err.name === 'ForbiddenError') {
    errorResponse.status = 'error';
    errorResponse.code = 'FORBIDDEN';
    errorResponse.message = 'Access forbidden';
    return res.status(403).json(errorResponse);
  }

  if (err.name === 'NotFoundError') {
    errorResponse.status = 'error';
    errorResponse.code = 'NOT_FOUND';
    errorResponse.message = 'Resource not found';
    return res.status(404).json(errorResponse);
  }

  // Handle database errors
  if (err.code === '23505') { // Unique violation
    errorResponse.status = 'error';
    errorResponse.code = 'DUPLICATE_ENTRY';
    errorResponse.message = 'Duplicate entry found';
    return res.status(409).json(errorResponse);
  }

  // Handle Supabase errors
  if (err.name === 'PostgrestError') {
    errorResponse.status = 'error';
    errorResponse.code = 'DATABASE_ERROR';
    errorResponse.message = err.message;
    return res.status(500).json(errorResponse);
  }

  // Handle custom errors
  if (err.statusCode) {
    errorResponse.status = 'error';
    errorResponse.code = err.code || 'CUSTOM_ERROR';
    errorResponse.message = err.message;
    return res.status(err.statusCode).json(errorResponse);
  }

  // For any other errors, return 500
  res.status(500).json(errorResponse);
};

module.exports = errorHandler;