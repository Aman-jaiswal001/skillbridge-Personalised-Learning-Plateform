export function success(res, data = {}, message = 'Operation successful', statusCode = 200, extra = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...extra,
  })
}

export function paginated(res, data, pagination, message = 'Operation successful') {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination,
  })
}

export function fail(res, message = 'Something went wrong', statusCode = 500, error = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'production' ? null : error,
  })
}
