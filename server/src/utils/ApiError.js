export class ApiError extends Error {
  constructor(statusCode, message, error = null) {
    super(message)
    this.statusCode = statusCode
    this.error = error
    this.success = false
  }

  static badRequest(message = 'Bad request', error = null) {
    return new ApiError(400, message, error)
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message)
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message)
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message)
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message)
  }

  static payloadTooLarge(message = 'File too large') {
    return new ApiError(413, message)
  }

  static unsupported(message = 'Unsupported media type') {
    return new ApiError(415, message)
  }

  static unprocessable(message = 'Validation failed', error = null) {
    return new ApiError(422, message, error)
  }

  static tooMany(message = 'Too many requests') {
    return new ApiError(429, message)
  }

  static ai(message = 'AI provider error', error = null) {
    return new ApiError(502, message, error)
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message)
  }
}
