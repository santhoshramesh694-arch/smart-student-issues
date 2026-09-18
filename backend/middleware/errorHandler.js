/**
 * Centralized Global Error Handler Middleware
 */

const { sendError } = require('../utils/responseHandler');

const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler Intercepted]:', err);

  // Handle Multer upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 'File size exceeds maximum allowed limit (5MB).', 413);
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return sendError(res, 'Unexpected file field in upload request.', 400);
  }

  // Handle MySQL Duplicate Entry Errors (e.g. unique email, roll_number, tracking_code)
  if (err.code === 'ER_DUP_ENTRY') {
    return sendError(res, 'A record with this identifier already exists.', 409);
  }

  // Handle Foreign Key Violations
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return sendError(res, 'Referenced record (category, user, or staff) does not exist.', 400);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid authentication token.', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Authentication token has expired. Please log in again.', 401);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred.';

  return sendError(res, message, statusCode);
};

module.exports = errorHandler;
