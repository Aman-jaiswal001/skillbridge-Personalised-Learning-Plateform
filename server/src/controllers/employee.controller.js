import { asyncHandler } from '../utils/asyncHandler.js'
import { success } from '../utils/response.js'
import * as employeeService from '../services/employee.service.js'
import { generateRecommendations, listRecommendations } from '../services/recommendation.service.js'
import { getLearningPath } from '../services/learningPath.service.js'
import { employeeAnalytics } from '../services/analytics.service.js'
import { myCourses } from '../services/course.service.js'

export const getMe = asyncHandler(async (req, res) => {
  const data = await employeeService.getEmployeeBundle(req.user._id)
  success(res, data)
})

export const updateMe = asyncHandler(async (req, res) => {
  const data = await employeeService.updateMe(req.user._id, req.body)
  success(res, data, 'Profile updated')
})

export const mySkills = asyncHandler(async (req, res) => {
  const data = await employeeService.listMySkills(req.user._id)
  success(res, data)
})

export const updateMySkills = asyncHandler(async (req, res) => {
  const data = await employeeService.upsertMySkills(req.user._id, req.body.skills || req.body)
  success(res, data, 'Skills updated')
})

export const addMySkill = asyncHandler(async (req, res) => {
  const data = await employeeService.addSkillToMe(req.user._id, req.body)
  success(res, data, 'Skill added', 201)
})

export const mySkillGaps = asyncHandler(async (req, res) => {
  const bundle = await employeeService.getEmployeeBundle(req.user._id)
  success(res, bundle.gaps)
})

export const myRecommendations = asyncHandler(async (req, res) => {
  let data = await listRecommendations(req.user._id)
  if (!data.length) data = await generateRecommendations(req.user._id)
  success(res, data)
})

export const myLearningPath = asyncHandler(async (req, res) => {
  const data = await getLearningPath(req.user._id)
  success(res, data)
})

export const myProgress = asyncHandler(async (req, res) => {
  const data = await myCourses(req.user._id)
  success(res, data)
})

export const myAnalytics = asyncHandler(async (req, res) => {
  const data = await employeeAnalytics(req.user._id)
  success(res, data)
})
