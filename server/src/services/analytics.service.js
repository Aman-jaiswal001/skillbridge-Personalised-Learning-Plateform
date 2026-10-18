import { User } from '../models/User.js'
import { EmployeeProfile } from '../models/EmployeeProfile.js'
import { EmployeeSkill } from '../models/EmployeeSkill.js'
import { Progress } from '../models/Progress.js'
import { AssessmentResult } from '../models/AssessmentResult.js'
import { QuizAttempt } from '../models/QuizAttempt.js'
import { Course } from '../models/Course.js'
import { Assessment } from '../models/Assessment.js'
import { AuditLog } from '../models/AuditLog.js'
import { StudyResource } from '../models/StudyResource.js'
import { YouTubeResource } from '../models/YouTubeResource.js'
import { analyseEmployeeSkills } from '../ai/skillGap/skillGap.engine.js'
import { ApiError } from '../utils/ApiError.js'

export async function employeeAnalytics(userId) {
  const user = await User.findById(userId)
  if (!user) throw ApiError.notFound('Employee not found')
  const profile = await EmployeeProfile.findOne({ userId })
  const skills = await EmployeeSkill.find({ employeeId: userId }).populate('skillId')
  const gaps = analyseEmployeeSkills(skills)
  const progress = await Progress.find({ employeeId: userId })
  const assessments = await AssessmentResult.find({ employeeId: userId, $or: [{ status: 'COMPLETED' }, { status: { $exists: false } }] }).sort({ completedAt: 1 })
  const quizzes = await QuizAttempt.find({ employeeId: userId }).sort({ completedAt: -1 }).limit(1)

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  const base = profile?.competencyScore || gaps.overallCompetency || 72
  const competencyGrowth = months.map((month, i) => ({
    month,
    score: Math.max(40, Math.round(base - (5 - i) * 2.5)),
  }))
  const learningHours = months.map((month, i) => ({
    month,
    hours: [6, 8, 7, 9, 10, 8][i],
  }))

  const latestQuiz = quizzes[0]
  return {
    cards: {
      competencyGrowth: `+${Math.max(0, competencyGrowth.at(-1).score - competencyGrowth[0].score)}%`,
      learningHours: progress.reduce((s, p) => s + (p.learningHours || 0), 0),
      coursesCompleted: progress.filter((p) => p.progressPercentage >= 100).length,
      assessmentsTaken: assessments.length,
      certificatesEarned: progress.filter((p) => p.certificateEarned).length,
      learningStreak: 12,
    },
    overallCompetency: base,
    competencyGrowth,
    learningHoursChart: learningHours,
    courseCompletionStats: [
      { name: 'Completed', value: progress.filter((p) => p.progressPercentage >= 100).length },
      { name: 'In Progress', value: progress.filter((p) => p.progressPercentage > 0 && p.progressPercentage < 100).length },
      { name: 'Not Started', value: Math.max(0, (await Course.countDocuments({ isActive: true })) - progress.length) },
    ],
    skillDistribution: gaps.categoryWise,
    quizPerformance: latestQuiz?.questionPerformance || [],
    skillWise: gaps.skillWise,
  }
}

export async function adminAnalytics() {
  const [totalEmployees, activeEmployees, courses, assessments, profiles, audit, videoResources, publishedVideoResources, studyResources, publishedStudyResources, draftAssessments] = await Promise.all([
    User.countDocuments({ role: { $in: ['STUDENT', 'EMPLOYEE'] } }),
    User.countDocuments({ role: { $in: ['STUDENT', 'EMPLOYEE'] }, isActive: true }),
    Course.countDocuments({ isActive: true }),
    Assessment.countDocuments({ isActive: true, isPublished: true }),
    EmployeeProfile.find().populate('userId', 'department isActive').lean(),
    AuditLog.find().sort({ timestamp: -1 }).limit(8).lean(),
    YouTubeResource.countDocuments(),
    YouTubeResource.countDocuments({ isPublished: true }),
    StudyResource.countDocuments(),
    StudyResource.countDocuments({ isPublished: true }),
    Assessment.countDocuments({ isActive: true, isPublished: false }),
  ])

  const departmentMap = new Map()
  for (const p of profiles) {
    const dept = p.department || p.userId?.department || 'Other'
    const row = departmentMap.get(dept) || { department: dept, total: 0, competency: 0 }
    row.total += 1
    row.competency += p.competencyScore || 0
    departmentMap.set(dept, row)
  }
  const departmentCompetency = [...departmentMap.values()].map((d) => ({
    department: d.department,
    competency: d.total ? Math.round(d.competency / d.total) : 0,
  }))

  const allSkills = await EmployeeSkill.find().lean()
  const dist = { Critical: 0, High: 0, Moderate: 0, Low: 0, 'No Gap': 0 }
  for (const s of allSkills) {
    const gap = Math.max(0, (s.targetPercent || 0) - (s.currentPercent || 0))
    if (gap >= 40) dist.Critical += 1
    else if (gap >= 25) dist.High += 1
    else if (gap >= 10) dist.Moderate += 1
    else if (gap > 0) dist.Low += 1
    else dist['No Gap'] += 1
  }

  const avgCompetency = profiles.length
    ? Math.round(profiles.reduce((s, p) => s + (p.competencyScore || 0), 0) / profiles.length)
    : 0

  return {
    totalEmployees,
    activeEmployees,
    activeLearners: totalEmployees ? Math.round((activeEmployees / totalEmployees) * 100) : 0,
    averageCompetency: avgCompetency,
    totalCourses: courses,
    totalAssessments: assessments,
    draftAssessments,
    videoResources,
    publishedVideoResources,
    studyResources,
    publishedStudyResources,
    departmentCompetency,
    skillGapDistribution: Object.entries(dist).map(([name, value]) => ({ name, value })),
    recentActivities: audit.map((a) => ({
      action: a.action,
      resource: a.resource,
      timestamp: a.timestamp,
    })),
  }
}
