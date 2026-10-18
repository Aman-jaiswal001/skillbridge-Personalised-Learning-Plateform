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
  const [assessments, quizzes] = await Promise.all([
    AssessmentResult.find({ employeeId: userId, $or: [{ status: 'COMPLETED' }, { status: { $exists: false } }] })
      .populate('assessmentId', 'title category level difficulty passingScore')
      .sort({ completedAt: 1, submittedAt: 1 }),
    QuizAttempt.find({ employeeId: userId })
      .populate('quizId', 'title topic difficulty')
      .sort({ completedAt: 1 }),
  ])

  const toLevel = (level, difficulty) => level || ({ Easy: 'Beginner', Medium: 'Intermediate', Hard: 'Advanced' })[difficulty] || 'Beginner'
  const formalAttempts = assessments.map((attempt) => {
    const assessment = attempt.assessmentId || {}
    const level = attempt.assessmentLevel || toLevel(assessment.level, assessment.difficulty)
    const passingScore = attempt.passingScore ?? assessment.passingScore ?? 70
    const percentage = Number(attempt.percentage) || 0
    return {
      id: String(attempt._id), title: assessment.title || 'Assessment', category: assessment.category || 'General',
      type: 'Skill assessment', level, score: attempt.score || 0, total: attempt.total || 0, percentage,
      passed: attempt.passed ?? percentage >= passingScore, completedAt: attempt.completedAt || attempt.submittedAt,
    }
  })
  const quizAttempts = quizzes.map((attempt) => {
    const quiz = attempt.quizId || {}
    const level = toLevel(null, quiz.difficulty)
    const percentage = Number(attempt.percentage) || 0
    return {
      id: String(attempt._id), title: quiz.title || 'Learning quiz', category: quiz.topic || 'Learning content',
      type: 'Learning quiz', level, score: attempt.score || 0, total: attempt.total || 0, percentage,
      passed: percentage >= 70, completedAt: attempt.completedAt,
    }
  })
  const allAttempts = [...formalAttempts, ...quizAttempts].sort((a, b) => new Date(a.completedAt || 0) - new Date(b.completedAt || 0))
  const monthlyScores = new Map()
  for (const attempt of allAttempts) {
    if (!attempt.completedAt) continue
    const date = new Date(attempt.completedAt)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const row = monthlyScores.get(key) || { month: date.toLocaleString('en', { month: 'short', year: '2-digit' }), total: 0, count: 0 }
    row.total += attempt.percentage
    row.count += 1
    monthlyScores.set(key, row)
  }
  const assessmentScoreTrend = [...monthlyScores.values()].map((row) => ({ month: row.month, score: Math.round(row.total / row.count) }))
  const typeMap = new Map()
  for (const attempt of allAttempts) {
    const name = `${attempt.type} · ${attempt.level}`
    const row = typeMap.get(name) || { name, attempts: 0, totalScore: 0, passed: 0, failed: 0 }
    row.attempts += 1
    row.totalScore += attempt.percentage
    if (attempt.passed) row.passed += 1
    else row.failed += 1
    typeMap.set(name, row)
  }
  const assessmentByType = [...typeMap.values()].map(({ totalScore, ...row }) => ({ ...row, averageScore: Math.round(totalScore / row.attempts) }))
  const overallCompetency = profile?.competencyScore ?? gaps.overallCompetency ?? 0
  const growth = assessmentScoreTrend.length > 1 ? assessmentScoreTrend.at(-1).score - assessmentScoreTrend[0].score : 0
  const completedAttemptCount = formalAttempts.length + quizAttempts.length
  const passedAttemptCount = allAttempts.filter((attempt) => attempt.passed).length
  const latestQuiz = quizzes.at(-1)
  return {
    cards: {
      competencyGrowth: `${growth > 0 ? '+' : ''}${growth}%`,
      learningHours: progress.reduce((s, p) => s + (p.learningHours || 0), 0),
      coursesCompleted: progress.filter((p) => p.progressPercentage >= 100).length,
      assessmentsTaken: assessments.length,
      learningQuizzesTaken: quizzes.length,
      assessmentPassRate: completedAttemptCount ? Math.round(passedAttemptCount / completedAttemptCount * 100) : 0,
      certificatesEarned: progress.filter((p) => p.certificateEarned).length,
      learningStreak: 0,
    },
    overallCompetency,
    assessmentScoreTrend,
    assessmentAnalytics: {
      totalAttempts: completedAttemptCount,
      passed: passedAttemptCount,
      failed: completedAttemptCount - passedAttemptCount,
      averageScore: completedAttemptCount ? Math.round(allAttempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / completedAttemptCount) : 0,
      byType: assessmentByType,
      recentAttempts: allAttempts.slice(-12).reverse(),
    },
    learningHoursChart: [],
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
