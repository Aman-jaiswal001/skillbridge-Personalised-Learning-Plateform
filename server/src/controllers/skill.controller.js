import { asyncHandler } from '../utils/asyncHandler.js'
import { success, paginated } from '../utils/response.js'
import * as skillService from '../services/skill.service.js'

export const list = asyncHandler(async (req, res) => {
  const { data, pagination } = await skillService.listSkills(req.query)
  paginated(res, data, pagination)
})

export const create = asyncHandler(async (req, res) => {
  const data = await skillService.createSkill(req.body)
  success(res, data, 'Skill created', 201)
})
