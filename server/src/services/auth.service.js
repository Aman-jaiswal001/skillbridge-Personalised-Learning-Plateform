import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { EmployeeProfile } from '../models/EmployeeProfile.js'
import { AuditLog } from '../models/AuditLog.js'
import { ApiError } from '../utils/ApiError.js'

function signToken(user) {
  return jwt.sign({ userId: user._id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  })
}

async function audit(userId, action, req, metadata = {}) {
  await AuditLog.create({
    userId,
    action,
    resource: 'auth',
    ip: req.ip,
    timestamp: new Date(),
    metadata,
  })
}

export async function registerUser(payload, req) {
  const exists = await User.findOne({
    $or: [{ email: payload.email.toLowerCase() }, { employeeId: payload.employeeId }],
  })
  if (exists) throw ApiError.conflict('Email or student ID already registered')

  const user = await User.create({
    name: payload.name,
    email: payload.email,
    password: payload.password,
    employeeId: payload.employeeId,
    role: 'STUDENT',
    department: payload.department || '',
    designation: payload.designation || '',
    phone: payload.phone || '',
  })

  await EmployeeProfile.create({
    userId: user._id,
    department: user.department,
    designation: user.designation,
    jobRole: user.designation,
  })

  console.info('[auth] registered', user.employeeId)
  await audit(user._id, 'REGISTER', req, { employeeId: user.employeeId })
  return { user: user.toSafeJSON(), token: signToken(user) }
}

export async function loginUser({ identifier, password }, req) {
  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { employeeId: identifier }],
  }).select('+password')
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid credentials')

  const ok = await user.comparePassword(password)
  if (!ok) throw ApiError.unauthorized('Invalid credentials')

  user.lastLogin = new Date()
  await user.save()
  console.info('[auth] login', user.employeeId)
  await audit(user._id, 'LOGIN', req, { employeeId: user.employeeId })
  const safe = await User.findById(user._id)
  return { user: safe.toSafeJSON(), token: signToken(user) }
}

export async function forgotPassword(email) {
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) return { message: 'If the account exists, a reset token has been issued' }

  const token = crypto.randomBytes(24).toString('hex')
  user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex')
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000)
  await user.save()
  if (env.nodeEnv !== 'production') {
    console.info('[auth] password reset token issued for', user.employeeId)
  }
  return {
    message: 'If the account exists, a reset token has been issued',
    ...(env.nodeEnv !== 'production' ? { resetToken: token } : {}),
  }
}

export async function resetPassword({ token, password }) {
  const hashed = crypto.createHash('sha256').update(token).digest('hex')
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+password +resetPasswordToken +resetPasswordExpires')
  if (!user) throw ApiError.badRequest('Invalid or expired reset token')
  user.password = password
  user.resetPasswordToken = undefined
  user.resetPasswordExpires = undefined
  await user.save()
  return { message: 'Password updated' }
}
