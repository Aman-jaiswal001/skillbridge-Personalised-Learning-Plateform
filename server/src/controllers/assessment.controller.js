import { asyncHandler } from '../utils/asyncHandler.js'
import { success } from '../utils/response.js'
import * as assessmentService from '../services/assessment.service.js'

export const history = asyncHandler(async (req, res) => {
  const data = await assessmentService.listAssessmentHistory(req.user._id, req.query)
  success(res, data)
})

export const list = asyncHandler(async (req, res) => {
  const data = await assessmentService.listAssessments(req.user._id)
  success(res, data)
})

export const getOne = asyncHandler(async (req, res) => {
  const data = await assessmentService.getAssessment(req.params.id)
  success(res, data)
})

export const start = asyncHandler(async (req, res) => {
  const data = await assessmentService.startAttempt(req.user._id, req.params.id)
  success(res, data, 'Assessment attempt started', 201)
})

export const attempt = asyncHandler(async (req, res) => {
  const data = await assessmentService.getAttempt(req.user._id, req.params.attemptId)
  success(res, data)
})

export const saveAnswers = asyncHandler(async (req, res) => {
  const data = await assessmentService.saveAttemptAnswers(req.user._id, req.params.attemptId, req.body.answers)
  success(res, data, 'Answers saved')
})

export const submitAttempt = asyncHandler(async (req, res) => {
  const data = await assessmentService.submitAttempt(req.user._id, req.params.attemptId)
  success(res, data, 'Assessment submitted')
})

export const result = asyncHandler(async (req, res) => {
  const data = await assessmentService.getAssessmentResult(req.user._id, req.params.resultId)
  success(res, data)
})

export const adminList = asyncHandler(async (_req, res) => {
  success(res, await assessmentService.listAdminAssessments())
})

export const adminCreate = asyncHandler(async (req, res) => {
  success(res, await assessmentService.createAssessment(req.body), 'Assessment saved as draft', 201)
})

export const adminUpdate = asyncHandler(async (req, res) => {
  success(res, await assessmentService.updateAssessment(req.params.id, req.body), 'Assessment updated')
})

export const adminPublish = asyncHandler(async (req, res) => {
  success(res, await assessmentService.setAssessmentPublished(req.params.id, req.body.published), req.body.published ? 'Assessment published' : 'Assessment unpublished')
})

export const adminArchive = asyncHandler(async (req, res) => {
  success(res, await assessmentService.archiveAssessment(req.params.id), 'Assessment archived')
})
