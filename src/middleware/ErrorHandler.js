/**
 * Error Handling Middleware
 * Centralized error handling for the application
 */

class ErrorHandler {
  // Validation error handler
  static handleValidationError(errors) {
    return {
      success: false,
      message: 'Validation failed',
      errors: errors,
      code: 'VALIDATION_ERROR'
    };
  }

  // Resource not found error
  static handleNotFound(resource = 'Resource') {
    return {
      success: false,
      message: `${resource} not found`,
      code: 'NOT_FOUND'
    };
  }

  // Unauthorized access error
  static handleUnauthorized(message = 'Unauthorized access') {
    return {
      success: false,
      message: message,
      code: 'UNAUTHORIZED'
    };
  }

  // Forbidden access error
  static handleForbidden(message = 'Access forbidden') {
    return {
      success: false,
      message: message,
      code: 'FORBIDDEN'
    };
  }

  // Internal server error
  static handleServerError(error, showDetails = false) {
    console.error('Server Error:', error);
    
    return {
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      ...(showDetails && { error: error.message })
    };
  }

  // Bad request error
  static handleBadRequest(message = 'Bad request') {
    return {
      success: false,
      message: message,
      code: 'BAD_REQUEST'
    };
  }

  // Conflict error (e.g., duplicate resource)
  static handleConflict(message = 'Resource conflict') {
    return {
      success: false,
      message: message,
      code: 'CONFLICT'
    };
  }

  // Express error handling middleware
  static expressErrorHandler(err, req, res, next) {
    // Log the error
    console.error(`${new Date().toISOString()} - Error:`, {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip
    });

    // Handle different types of errors
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json(ErrorHandler.handleBadRequest('Invalid JSON format'));
    }

    if (err.type === 'entity.too.large') {
      return res.status(413).json(ErrorHandler.handleBadRequest('Request entity too large'));
    }

    // Default server error
    res.status(500).json(ErrorHandler.handleServerError(err, process.env.NODE_ENV === 'development'));
  }

  // Async route wrapper to catch async errors
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // API response formatter
  static formatResponse(data, message = 'Success', statusCode = 200) {
    return {
      success: true,
      message: message,
      data: data,
      timestamp: new Date().toISOString()
    };
  }

  // Paginated response formatter
  static formatPaginatedResponse(data, pagination, message = 'Success') {
    return {
      success: true,
      message: message,
      data: data,
      pagination: {
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        totalItems: pagination.totalItems,
        itemsPerPage: pagination.itemsPerPage,
        hasNext: pagination.hasNext,
        hasPrev: pagination.hasPrev
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ErrorHandler;