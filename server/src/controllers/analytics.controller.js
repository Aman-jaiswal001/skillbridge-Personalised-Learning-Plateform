import { asyncHandler } from '../utils/asyncHandler.js'
import { success } from '../utils/response.js'
import { employeeAnalytics, adminAnalytics } from '../services/analytics.service.js'

export const employee = asyncHandler(async (req, res) => {
  const data = await employeeAnalytics(req.user._id)
  success(res, data)
})

export const admin = asyncHandler(async (_req, res) => {
  const data = await adminAnalytics()
  success(res, data)
})
