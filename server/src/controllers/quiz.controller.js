import { asyncHandler } from '../utils/asyncHandler.js'
import { success, paginated } from '../utils/response.js'
import * as quizService from '../services/quiz.service.js'

export const generate = asyncHandler(async (req, res) => {
  const data = await quizService.generateQuiz(req.user._id, req.body)
  success(res, data, 'Quiz generated', 201)
})

export const generateYouTube = asyncHandler(async (req, res) => {
  const data = await quizService.generateYouTubeQuiz(req.user._id, req.params.itemId)
  success(res, data, 'Lesson quiz ready')
})

export const performance = asyncHandler(async (req, res) => {
  success(res, await quizService.performanceSummary(req.user._id))
})

export const list = asyncHandler(async (req, res) => {
  const data = await quizService.listQuizzes(req.user._id)
  success(res, data)
})

export const history = asyncHandler(async (req, res) => {
  const { data, pagination } = await quizService.quizHistory(req.user._id, req.query)
  paginated(res, data, pagination)
})

export const getOne = asyncHandler(async (req, res) => {
  const data = await quizService.getQuiz(req.user._id, req.params.id)
  success(res, data)
})

export const submit = asyncHandler(async (req, res) => {
  const data = await quizService.submitQuiz(req.user._id, req.params.id, req.body.answers, req.body.submissionKey)
  success(res, data, 'Quiz submitted')
})

export const result = asyncHandler(async (req, res) => {
  const data = await quizService.getQuizResult(req.user._id, req.params.id)
  success(res, data)
})
