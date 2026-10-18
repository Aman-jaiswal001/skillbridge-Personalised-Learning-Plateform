import { User } from '../models/User.js'
import { EmployeeProfile } from '../models/EmployeeProfile.js'
import { EmployeeSkill } from '../models/EmployeeSkill.js'
import { Skill } from '../models/Skill.js'
import { Progress } from '../models/Progress.js'
import { AssessmentResult } from '../models/AssessmentResult.js'
import { ApiError } from '../utils/ApiError.js'
import { analyseEmployeeSkills, percentToLevel } from '../ai/skillGap/skillGap.engine.js'
import { mapCompetencyScore } from '../ai/skillGap/competencyMapper.js'

export async function getEmployeeBundle(userId) {
  const user = await User.findById(userId)
  if (!user) throw ApiError.notFound('Employee not found')
  const profile = await EmployeeProfile.findOne({ userId })
  const skills = await EmployeeSkill.find({ employeeId: userId }).populate('skillId')
  const gaps = analyseEmployeeSkills(skills)
  const progress = await Progress.find({ employeeId: userId })
  const assessmentsTaken = await AssessmentResult.countDocuments({ employeeId: userId, $or: [{ status: 'COMPLETED' }, { status: { $exists: false } }] })
  const coursesCompleted = progress.filter((p) => p.progressPercentage >= 100).length
  const learningHours = progress.reduce((s, p) => s + (p.learningHours || 0), 0)
  const certificates = progress.filter((p) => p.certificateEarned).length
  const competency = profile?.competencyScore || gaps.overallCompetency

  return {
    user: user.toSafeJSON(),
    profile,
    stats: {
      overallCompetency: competency,
      skillsAnalysed: skills.length,
      coursesCompleted,
      assessmentsTaken,
      certificates,
      learningHours,
      streak: 12,
    },
    gaps,
  }
}

export async function updateMe(userId, payload) {
  const user = await User.findById(userId)
  if (!user) throw ApiError.notFound('Employee not found')
  const allowed = ['name', 'phone', 'department', 'designation']
  for (const key of allowed) {
    if (payload[key] !== undefined) user[key] = payload[key]
  }
  await user.save()

  const profile = await EmployeeProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        education: payload.education ?? undefined,
        experience: payload.experience ?? undefined,
        department: payload.department ?? user.department,
        designation: payload.designation ?? user.designation,
        jobRole: payload.jobRole ?? payload.designation,
        assignment: payload.assignment,
        careerGoal: payload.careerGoal,
        location: payload.location,
        priorTraining: payload.priorTraining,
        futureRequirements: payload.futureRequirements,
      },
    },
    { new: true, upsert: true },
  )
  return { user: user.toSafeJSON(), profile }
}

export async function listMySkills(userId) {
  const rows = await EmployeeSkill.find({ employeeId: userId }).populate('skillId').lean()
  const gaps = analyseEmployeeSkills(rows)
  return {
    skills: gaps.skillWise,
    summary: {
      totalSkills: rows.length,
      advanced: rows.filter((r) => r.currentLevel >= 3).length,
      intermediate: rows.filter((r) => r.currentLevel === 2).length,
      beginner: rows.filter((r) => r.currentLevel <= 1).length,
    },
    radar: gaps.categoryWise.map((c) => ({ subject: c.category, A: c.current, fullMark: 100 })),
  }
}

export async function upsertMySkills(userId, skillsPayload = []) {
  for (const item of skillsPayload) {
    let skill = null
    if (item.skillId) skill = await Skill.findById(item.skillId)
    else if (item.name) skill = await Skill.findOne({ name: item.name })
    if (!skill) continue
    const currentPercent = Number(item.currentPercent ?? item.currentLevel ?? 50)
    const targetPercent = Number(item.targetPercent ?? item.targetLevel ?? 80)
    await EmployeeSkill.findOneAndUpdate(
      { employeeId: userId, skillId: skill._id },
      {
        currentPercent,
        targetPercent,
        currentLevel: percentToLevel(currentPercent),
        targetLevel: percentToLevel(targetPercent),
        confidence: item.confidence ?? 60,
        source: 'self',
      },
      { upsert: true, new: true },
    )
  }
  const profile = await EmployeeProfile.findOne({ userId })
  const rows = await EmployeeSkill.find({ employeeId: userId })
  if (profile) {
    profile.competencyScore = mapCompetencyScore(rows)
    await profile.save()
  }
  return listMySkills(userId)
}

export async function addSkillToMe(userId, { skillId, name,category, currentPercent = 40, targetPercent = 80 }) {
  let skill = skillId ? await Skill.findById(skillId) : await Skill.findOne({ name })
  if (!skill && name) {
    skill = await Skill.create({ name, category, description: name })
  }
  if (!skill) throw ApiError.badRequest('Skill is required')
  await EmployeeSkill.findOneAndUpdate(
    { employeeId: userId, skillId: skill._id },
    {
      currentPercent,
      targetPercent,
      currentLevel: percentToLevel(currentPercent),
      targetLevel: percentToLevel(targetPercent),
      source: 'self',
    },
    { upsert: true, new: true },
  )
  return listMySkills(userId)
}
