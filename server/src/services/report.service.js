import { User } from '../models/User.js'
import { EmployeeProfile } from '../models/EmployeeProfile.js'
import { EmployeeSkill } from '../models/EmployeeSkill.js'
import { Progress } from '../models/Progress.js'
import { AssessmentResult } from '../models/AssessmentResult.js'
import { analyseEmployeeSkills } from '../ai/skillGap/skillGap.engine.js'
import { ApiError } from '../utils/ApiError.js'

export async function employeeReport(id) {
  const user = await User.findById(id)
  if (!user) throw ApiError.notFound('Employee not found')
  const profile = await EmployeeProfile.findOne({ userId: id })
  const skills = await EmployeeSkill.find({ employeeId: id }).populate('skillId')
  const gaps = analyseEmployeeSkills(skills)
  const progress = await Progress.find({ employeeId: id }).populate('courseId', 'title')
  const assessments = await AssessmentResult.find({ employeeId: id }).populate('assessmentId', 'title')
  return {
    type: 'employee',
    generatedAt: new Date(),
    employee: user.toSafeJSON(),
    profile,
    competency: profile?.competencyScore || gaps.overallCompetency,
    skillGaps: gaps,
    courses: progress,
    assessments,
  }
}

export async function departmentReport(department) {
  const users = await User.find({ department: new RegExp(department, 'i'), role: { $in: ['STUDENT', 'EMPLOYEE'] } })
  const reports = []
  for (const user of users) {
    reports.push(await employeeReport(user._id))
  }
  const avg =
    reports.length === 0 ? 0 : Math.round(reports.reduce((s, r) => s + (r.competency || 0), 0) / reports.length)
  return {
    type: 'department',
    department,
    generatedAt: new Date(),
    headcount: users.length,
    averageCompetency: avg,
    employees: reports.map((r) => ({
      name: r.employee.name,
      designation: r.employee.designation,
      competency: r.competency,
      criticalGaps: r.skillGaps.criticalGaps,
    })),
  }
}

export async function skillGapReport() {
  const users = await User.find({ role: { $in: ['STUDENT', 'EMPLOYEE'] }, isActive: true })
  const rows = []
  for (const user of users) {
    const skills = await EmployeeSkill.find({ employeeId: user._id }).populate('skillId')
    const gaps = analyseEmployeeSkills(skills)
    rows.push({
      employee: user.name,
      department: user.department,
      overallGap: gaps.overallGap,
      critical: gaps.criticalGaps,
      topGaps: gaps.skillWise.slice(0, 3).map((s) => ({ skill: s.skill, percentGap: s.percentGap, status: s.status })),
    })
  }
  return { type: 'skill-gaps', generatedAt: new Date(), rows }
}

export async function trainingEffectivenessReport() {
  const progress = await Progress.find().populate('employeeId', 'name department').populate('courseId', 'title')
  const completed = progress.filter((p) => p.progressPercentage >= 100).length
  return {
    type: 'training-effectiveness',
    generatedAt: new Date(),
    enrolled: progress.length,
    completed,
    completionRate: progress.length ? Math.round((completed / progress.length) * 100) : 0,
    averageProgress: progress.length
      ? Math.round(progress.reduce((s, p) => s + p.progressPercentage, 0) / progress.length)
      : 0,
    items: progress.slice(0, 50),
  }
}
