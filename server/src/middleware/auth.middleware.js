import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) throw ApiError.unauthorized('Authentication required')

  let decoded
  try {
    decoded = jwt.verify(token, env.jwtSecret)
  } catch {
    throw ApiError.unauthorized('Invalid or expired token')
  }

  const user = await User.findById(decoded.userId)
  if (!user || !user.isActive) throw ApiError.unauthorized('Account is inactive or not found')

  req.user = user
  req.auth = { userId: user._id, role: user.role }
  next()
})
