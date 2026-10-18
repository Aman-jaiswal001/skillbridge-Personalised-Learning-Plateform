import { Skill } from '../models/Skill.js'
import { Competency } from '../models/Competency.js'
import { ApiError } from '../utils/ApiError.js'
import { parsePagination, buildPagination } from '../utils/pagination.js'

export async function listSkills(query) {
  const { page, limit, skip } = parsePagination(query)
  const filter = {}
  if (query.category && query.category !== 'All Skills') filter.category = query.category
  if (query.q) filter.name = new RegExp(query.q, 'i')
  const [data, total] = await Promise.all([
    Skill.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Skill.countDocuments(filter),
  ])
  return { data, pagination: buildPagination({ page, limit, total }) }
}

export async function createSkill(payload) {
  const exists = await Skill.findOne({ name: payload.name })
  if (exists){ throw ApiError.conflict('Skill already exists')}
  

  return Skill.create(payload)
}

export async function listCompetencies() {
  return Competency.find({ isActive: true }).populate('skillIds').lean()
}
