/**
 * Helper function to handle pagination for database queries
 * @param {Object} req - Express request object
 * @returns {Object} Pagination parameters
 */
const getPaginationParams = (req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  
  return {
    page,
    limit,
    startIndex,
    range: { from: startIndex, to: startIndex + limit - 1 }
  };
};

/**
 * Format paginated response
 * @param {Array} data - Data array
 * @param {number} count - Total count
 * @param {Object} pagination - Pagination parameters
 * @returns {Object} Formatted response
 */
const paginatedResponse = (data, count, pagination) => {
  const { page, limit } = pagination;
  const totalPages = Math.ceil(count / limit);
  
  return {
    data,
    meta: {
      total: count,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

module.exports = {
  getPaginationParams,
  paginatedResponse
};