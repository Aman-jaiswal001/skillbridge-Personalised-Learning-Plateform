import { ApiError } from '../utils/ApiError.js'

export function requireRole(...roles) {
  const allowed = roles.flat()
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized())
    if (!allowed.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'))
    }
    next()
  }
}
