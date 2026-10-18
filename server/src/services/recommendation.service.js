import { User } from '../models/User.js'
import { EmployeeProfile } from '../models/EmployeeProfile.js'
import { EmployeeSkill } from '../models/EmployeeSkill.js'
import { Course } from '../models/Course.js'
import { Progress } from '../models/Progress.js'
import { Recommendation } from '../models/Recommendation.js'
import { analyseEmployeeSkills } from '../ai/skillGap/skillGap.engine.js'
import { rankCourses } from '../ai/skillGap/courseRanker.js'
import { runRecommendationRationaleChain } from '../ai/chains/recommendation.chain.js'
import { getIgotAdapter } from './igot/igot.adapter.js'
import { notify } from './notification.service.js'
import { ApiError } from '../utils/ApiError.js'

export async function generateRecommendations(userId) {
  const employee = await User.findById(userId)
  if (!employee) throw ApiError.notFound('Employee not found')
  const profile = await EmployeeProfile.findOne({ userId })
  const skillRows = await EmployeeSkill.find({ employeeId: userId }).populate('skillId')
  const gaps = analyseEmployeeSkills(skillRows)
  const courses = await Course.find({ isActive: true }).populate('skills', 'name category').lean()
  const progressRows = await Progress.find({ employeeId: userId }).lean()
  const progressByCourseId = new Map(progressRows.map((p) => [String(p.courseId), p]))

  let catalog = courses
  try {
    const adapter = getIgotAdapter()
    const igot = await adapter.getRecommendedCourses({ department: employee.department, role: employee.designation })
    if (Array.isArray(igot) && igot.length) {
      const extra = igot.filter((c) => c && c.title && !catalog.some((x) => x.title === c.title))
      catalog = catalog.concat(extra)
    }
  } catch (err) {
    console.error('[igot] adapter skipped', err.message)
  }

  let ranked = rankCourses({ employee, profile, gaps, courses: catalog, progressByCourseId }).slice(0, 8)
  // ranked = await runRecommendationRationaleChain({
  //   employeeName: employee.name,
  //   designation: employee.designation,
  //   items: ranked,
  // })

  const docs = []
  for (const item of ranked) {
    if (!item.course?._id) continue
    docs.push({
      employeeId: userId,
      courseId: item.course._id,
      skillGap: item.skillGap,
      reason: item.reason,
      priority: item.priority,
      score: item.score,
      matchedSkills: item.matchedSkills,
      gapAddressed: item.gapAddressed,
      source: 'engine',
    })
  }
  for (const doc of docs) {
    await Recommendation.findOneAndUpdate(
      { employeeId: doc.employeeId, courseId: doc.courseId },
      { $set: doc },
      { upsert: true, new: true },
    )
  }

  const top = ranked[0]
  if (top?.course?._id) {
    await notify(userId, {
      type: 'recommendation',
      title: 'New course recommended',
      message: `${top.course.title} has been added based on your skill gap.`,
      metadata: { courseId: top.course._id },
    })
  }

  return listRecommendations(userId)
}

export async function listRecommendations(userId) {
  const rows = await Recommendation.find({ employeeId: userId })
    .populate({ path: 'courseId', populate: { path: 'skills', select: 'name' } })
    .sort({ score: -1 })
    .lean()
  return rows.map((r) => ({
    ...r.courseId,
    recommendationId: r._id,
    reason: r.reason,
    priority: r.priority,
    score: r.score,
    matchedSkills: r.matchedSkills,
    gapAddressed: r.gapAddressed,
    skillGap: r.skillGap,
    recommended: true,
  }))
}
