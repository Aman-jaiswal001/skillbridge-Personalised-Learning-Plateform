import { asyncHandler } from '../utils/asyncHandler.js'
import { success } from '../utils/response.js'
import { listCompetencies } from '../services/skill.service.js'

export const list = asyncHandler(async (_req, res) => {
  const data = await listCompetencies()
  success(res, data)
})
