import { asyncHandler } from '../utils/asyncHandler.js'
import { success } from '../utils/response.js'
import * as reportService from '../services/report.service.js'

export const employee = asyncHandler(async (req, res) => {
  const data = await reportService.employeeReport(req.params.id)
  success(res, data, 'Employee report generated')
})

export const department = asyncHandler(async (req, res) => {
  const data = await reportService.departmentReport(req.params.department)
  success(res, data, 'Department report generated')
})

export const skillGaps = asyncHandler(async (_req, res) => {
  const data = await reportService.skillGapReport()
  success(res, data, 'Skill gap report generated')
})

export const training = asyncHandler(async (_req, res) => {
  const data = await reportService.trainingEffectivenessReport()
  success(res, data, 'Training effectiveness report generated')
})
