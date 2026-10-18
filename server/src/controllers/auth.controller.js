import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { success } from '../utils/response.js'
import { validate } from '../middleware/validate.middleware.js'
import * as authService from '../services/auth.service.js'

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    employeeId: z.string().min(3),
    department: z.string().optional(),
    designation: z.string().optional(),
  }),
})

const loginSchema = z.object({
  body: z.object({
    email: z.string().optional(),
    employeeId: z.string().optional(),
    identifier: z.string().optional(),
    password: z.string().min(1),
  }),
})

export const register = [
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const data = await authService.registerUser(req.body, req)
    success(res, data, 'Registration successful', 201)
  }),
]

export const login = [
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const identifier = req.body.identifier || req.body.email || req.body.employeeId
    const data = await authService.loginUser({ identifier, password: req.body.password }, req)
    success(res, data, 'Login successful')
  }),
]

export const logout = asyncHandler(async (_req, res) => {
  success(res, {}, 'Logged out')
})

export const me = asyncHandler(async (req, res) => {
  success(res, { user: req.user.toSafeJSON() }, 'Profile loaded')
})

export const forgotPassword = asyncHandler(async (req, res) => {
  const data = await authService.forgotPassword(req.body.email)
  success(res, data, data.message)
})

export const resetPassword = asyncHandler(async (req, res) => {
  const data = await authService.resetPassword(req.body)
  success(res, data, data.message)
})
