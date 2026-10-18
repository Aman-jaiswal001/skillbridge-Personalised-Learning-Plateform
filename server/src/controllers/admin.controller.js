import { asyncHandler } from '../utils/asyncHandler.js'
import { success, paginated } from '../utils/response.js'
import { User } from '../models/User.js'
import { EmployeeProfile } from '../models/EmployeeProfile.js'
import { EmployeeSkill } from '../models/EmployeeSkill.js'
import { Assessment } from '../models/Assessment.js'
import { Course } from '../models/Course.js'
import { AuditLog } from '../models/AuditLog.js'
import { adminAnalytics } from '../services/analytics.service.js'
import { generateRecommendations } from '../services/recommendation.service.js'
import { generateLearningPath } from '../services/learningPath.service.js'
import { notify } from '../services/notification.service.js'
import { parsePagination, buildPagination } from '../utils/pagination.js'
import { ApiError } from '../utils/ApiError.js'
import { mapCompetencyScore } from '../ai/skillGap/competencyMapper.js'

export const dashboard = asyncHandler(async (_req, res) => {
  const analytics = await adminAnalytics()
  success(res, {
    ...analytics,
    quickActions: ['Add Employee', 'Upload Course', 'Generate Report', 'Send Notification'],
  })
})

export const listEmployees = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query)
  const filter = { role: { $in: ['STUDENT', 'EMPLOYEE', 'TRAINER'] } }
  if (req.query.q) {
    filter.$or = [
      { name: new RegExp(req.query.q, 'i') },
      { email: new RegExp(req.query.q, 'i') },
      { employeeId: new RegExp(req.query.q, 'i') },
    ]
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ])
  const profiles = await EmployeeProfile.find({ userId: { $in: users.map((u) => u._id) } }).lean()
  const byUser = new Map(profiles.map((p) => [String(p.userId), p]))
  const data = users.map((u) => ({
    ...u,
    competency: byUser.get(String(u._id))?.competencyScore || 0,
    status: u.isActive ? 'Active' : 'Inactive',
  }))
  paginated(res, data, buildPagination({ page, limit, total }))
})

export const createEmployee = asyncHandler(async (req, res) => {
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password || 'password',
    employeeId: req.body.employeeId,
    role: req.body.role || 'STUDENT',
    department: req.body.department || '',
    designation: req.body.designation || req.body.roleTitle || '',
    phone: req.body.phone || '',
  })
  await EmployeeProfile.create({
    userId: user._id,
    department: user.department,
    designation: user.designation,
    jobRole: user.designation,
    competencyScore: 0,
  })
  await AuditLog.create({
    userId: req.user._id,
    action: 'CREATE_EMPLOYEE',
    resource: 'User',
    resourceId: String(user._id),
    ip: req.ip,
  })
  success(res, user.toSafeJSON(), 'Employee created', 201)
})

export const getEmployee = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) throw ApiError.notFound('Employee not found')
  const profile = await EmployeeProfile.findOne({ userId: user._id })
  const skills = await EmployeeSkill.find({ employeeId: user._id }).populate('skillId')
  success(res, { user: user.toSafeJSON(), profile, skills })
})

export const updateEmployee = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) throw ApiError.notFound('Employee not found')
  const fields = ['name', 'department', 'designation', 'phone', 'isActive', 'role']
  for (const key of fields) {
    if (req.body[key] !== undefined) user[key] = req.body[key]
  }
  await user.save()
  await EmployeeProfile.findOneAndUpdate(
    { userId: user._id },
    { department: user.department, designation: user.designation },
  )
  success(res, user.toSafeJSON(), 'Employee updated')
})

export const deleteEmployee = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })
  if (!user) throw ApiError.notFound('Employee not found')
  success(res, user.toSafeJSON(), 'Employee deactivated')
})

export const refreshEmployeeIntel = asyncHandler(async (req, res) => {
  const skills = await EmployeeSkill.find({ employeeId: req.params.id })
  const profile = await EmployeeProfile.findOne({ userId: req.params.id })
  if (profile) {
    profile.competencyScore = mapCompetencyScore(skills)
    await profile.save()
  }
  await generateRecommendations(req.params.id)
  await generateLearningPath(req.params.id)
  success(res, {}, 'Employee intelligence refreshed')
})

export const broadcast = asyncHandler(async (req, res) => {
  const users = await User.find({ isActive: true, role: { $in: ['STUDENT', 'EMPLOYEE'] } }).select('_id')
  await Promise.all(
    users.map((u) =>
      notify(u._id, {
        type: req.body.type || 'system',
        title: req.body.title,
        message: req.body.message,
      }),
    ),
  )
  success(res, { recipients: users.length }, 'Notification sent')
})

export const assessments = asyncHandler(async (_req, res) => {
  const data = await Assessment.find().populate('skills', 'name').lean()
  success(res, data)
})

export const courses = asyncHandler(async (_req, res) => {
  const data = await Course.find().populate('skills', 'name').lean()
  success(res, data)
})
