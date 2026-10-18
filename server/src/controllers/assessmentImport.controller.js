import { asyncHandler } from '../utils/asyncHandler.js'
import { success } from '../utils/response.js'
import * as assessmentImportService from '../services/assessmentImport.service.js'

export const template = asyncHandler(async (_req, res) => {
  const buffer = await assessmentImportService.buildAssessmentTemplate()
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename="skillbridge-assessment-template.xlsx"',
    'Content-Length': buffer.length,
    'Cache-Control': 'private, no-store',
  }).send(Buffer.from(buffer))
})

export const preview = asyncHandler(async (req, res) => {
  const data = await assessmentImportService.previewAssessmentSpreadsheet(req.file)
  success(res, data, 'Spreadsheet validated')
})

export const importQuestions = asyncHandler(async (req, res) => {
  const data = await assessmentImportService.importAssessmentSpreadsheet({ file: req.file, body: req.body, userId: req.user._id })
  success(res, data, data.duplicateRequest ? 'This import was already completed' : 'Assessment questions imported', data.duplicateRequest ? 200 : 201)
})
