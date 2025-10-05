export const successResponse = (res, statusCode = 200, data = null, message = 'Success') => {
  const response = {
    success: true,
    message,
    ...(data && { data })
  };

  return res.status(statusCode).json(response);
};

export const errorResponse = (res, statusCode = 500, error = {}) => {
  const response = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An internal error occurred',
      ...(error.field && { field: error.field }),
      ...(error.details && { details: error.details })
    }
  };

  return res.status(statusCode).json(response);
};

export const paginatedResponse = (res, data, pagination, message = 'Success') => {
  const response = {
    success: true,
    message,
    data,
    pagination: {
      total: pagination.total,
      limit: pagination.limit,
      offset: pagination.offset,
      next_offset: pagination.offset + pagination.limit < pagination.total 
        ? pagination.offset + pagination.limit 
        : null
    }
  };

  return res.status(200).json(response);
};

export const validationErrorResponse = (res, errors) => {
  const formattedErrors = errors.array().map(err => ({
    code: 'FIELD_VALIDATION_ERROR',
    field: err.path || err.param,
    message: err.msg,
    value: err.value
  }));

  return res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: formattedErrors
    }
  });
};