import mongoose from 'mongoose'
import multer from 'multer'
import { env } from '../config/env.js'
import { fail } from '../utils/response.js'

export function errorMiddleware(err, req, res, _next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return fail(res, 'File exceeds the 20MB limit', 413)
    }
    return fail(res, err.message || 'Upload error', 400)
  }

  if (err.name === 'ZodError' || err.issues) {
    return fail(res, 'Validation failed', 422, err.issues || err.errors)
  }

  if (err instanceof mongoose.Error.CastError) {
    return fail(res, 'Invalid identifier', 400)
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return fail(res, 'Validation failed', 422, err.errors)
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field'
    return fail(res, `${field} already exists`, 409)
  }

  const status = err.statusCode || 500
  const message = err.message || 'Something went wrong'

  if (status >= 500) {
    console.error('[error]', req.method, req.originalUrl, message)
  }

  return fail(res, message, status, env.nodeEnv === 'production' ? null : err.error || null)
}

export function notFoundMiddleware(req, res) {
  return fail(res, `Route not found: ${req.method} ${req.originalUrl}`, 404)
}
