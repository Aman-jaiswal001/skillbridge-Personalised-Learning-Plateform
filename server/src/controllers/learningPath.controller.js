import { asyncHandler } from '../utils/asyncHandler.js'
import { success } from '../utils/response.js'
import { generateLearningPath, getLearningPath } from '../services/learningPath.service.js'

export const getMine = asyncHandler(async (req, res) => {
  const data = await getLearningPath(req.user._id)
  success(res, data)
})

export const refresh = asyncHandler(async (req, res) => {
  const data = await generateLearningPath(req.user._id)
  success(res, data, 'Learning path updated')
})
