import { asyncHandler } from '../utils/asyncHandler.js'
import { success } from '../utils/response.js'
import * as quizService from '../services/quiz.service.js'

export const generate = asyncHandler(async (req, res) => {
  const data = await quizService.generateQuiz(req.user._id, req.body)
  success(res, data, 'Quiz generated', 201)
})

export const list = asyncHandler(async (req, res) => {
  const data = await quizService.listQuizzes(req.user._id)
  success(res, data)
})

export const history = asyncHandler(async (req, res) => {
  const data = await quizService.quizHistory(req.user._id)
  success(res, data)
})

export const getOne = asyncHandler(async (req, res) => {
  const data = await quizService.getQuiz(req.user._id, req.params.id)
  success(res, data)
})

export const submit = asyncHandler(async (req, res) => {
  const data = await quizService.submitQuiz(req.user._id, req.params.id, req.body.answers || [])
  success(res, data, 'Quiz submitted')
})

export const result = asyncHandler(async (req, res) => {
  const data = await quizService.getQuizResult(req.user._id, req.params.id)
  success(res, data)
})
