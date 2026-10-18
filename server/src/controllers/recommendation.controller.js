import { asyncHandler } from '../utils/asyncHandler.js'
import { success } from '../utils/response.js'
import { generateRecommendations, listRecommendations } from '../services/recommendation.service.js'

export const listMine = asyncHandler(async (req, res) => {
  let data = await listRecommendations(req.user._id)
  if (!data.length) data = await generateRecommendations(req.user._id)
  success(res, data)
})

export const refresh = asyncHandler(async (req, res) => {
  const data = await generateRecommendations(req.user._id)
  success(res, data, 'Recommendations refreshed')
})
