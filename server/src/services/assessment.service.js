import mongoose from 'mongoose'
import { Assessment } from '../models/Assessment.js'
import { Question } from '../models/Question.js'
import { AssessmentResult } from '../models/AssessmentResult.js'
import { EmployeeSkill } from '../models/EmployeeSkill.js'
import { EmployeeProfile } from '../models/EmployeeProfile.js'
import { ApiError } from '../utils/ApiError.js'
import { scoreAttempt, skillWisePerformance } from '../utils/scoring.js'
import { applyAssessmentToSkills, mapCompetencyScore } from '../ai/skillGap/competencyMapper.js'
import { generateRecommendations } from './recommendation.service.js'
import { generateLearningPath } from './learningPath.service.js'
import { notify } from './notification.service.js'

const WEAK_SKILL_THRESHOLD = 60

function requireObjectId(id, label = 'ID') {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest(`Invalid ${label}`)
}

function orderedQuestions(assessment, questions) {
  const order = new Map(assessment.questions.map((id, index) => [String(id), index]))
  return questions.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)))
}

function publicQuestion(q) {
  return {
    id: q._id,
    question: q.question,
    options: q.options,
    category: q.category,
    skill: q.skill || q.skillId?.name || '',
    difficulty: q.difficulty,
    marks: q.marks ?? 1,
  }
}

async function loadAssessment(id) {
  requireObjectId(id, 'assessment ID')
  const assessment = await Assessment.findOne({ _id: id, isActive: true }).populate('skills', 'name')
  if (!assessment) throw ApiError.notFound('Assessment not found')
  return assessment
}

async function loadQuestions(assessment, { privateKey = false } = {}) {
  let query = Question.find({ _id: { $in: assessment.questions } })
  if (!privateKey) query = query.select('-correctAnswer -explanation')
  const questions = orderedQuestions(assessment, await query.populate('skillId', 'name'))
  if (!questions.length) throw ApiError.badRequest('Assessment has no questions')
  return questions
}

export async function listAssessments(userId) {
  const [assessments, attempts] = await Promise.all([
    Assessment.find({ isActive: true }).populate('skills', 'name').lean(),
    AssessmentResult.find({ employeeId: userId }).sort({ startedAt: -1, createdAt: -1 }).lean(),
  ])
  const byAssessment = new Map()
  for (const attempt of attempts) {
    const key = String(attempt.assessmentId)
    const entry = byAssessment.get(key) || { latest: null, completed: [] }
    if (!entry.latest) entry.latest = attempt
    if (attempt.status === 'COMPLETED' || attempt.status === undefined) entry.completed.push(attempt)
    byAssessment.set(key, entry)
  }
  return assessments.map((assessment) => {
    const entry = byAssessment.get(String(assessment._id)) || { latest: null, completed: [] }
    const latestCompleted = entry.completed[0] || null
    const inProgress = entry.latest?.status === 'IN_PROGRESS' ? entry.latest : null
    return {
      ...assessment,
      questionCount: assessment.questions?.length || 0,
      attemptCount: entry.completed.length,
      canRetake: assessment.allowRetakes !== false,
      attemptStatus: inProgress ? 'IN_PROGRESS' : latestCompleted ? 'COMPLETED' : 'NOT_STARTED',
      activeAttemptId: inProgress?._id || null,
      myResult: latestCompleted ? {
        id: latestCompleted._id,
        score: latestCompleted.score,
        total: latestCompleted.total,
        percentage: latestCompleted.percentage,
        completedAt: latestCompleted.completedAt || latestCompleted.submittedAt,
      } : null,
    }
  })
}

export async function startAttempt(userId, assessmentId) {
  const assessment = await loadAssessment(assessmentId)
  const existing = await AssessmentResult.findOne({ employeeId: userId, assessmentId, status: 'IN_PROGRESS' }).sort({ startedAt: -1 })
  if (existing) {
    const data = await getAttempt(userId, existing._id)
    return { ...data, attemptId: existing._id }
  }

  const hasPriorResult = await AssessmentResult.exists({ employeeId: userId, assessmentId, $or: [{ status: 'COMPLETED' }, { status: { $exists: false } }] })
  if (hasPriorResult && assessment.allowRetakes === false) throw ApiError.forbidden('Retakes are not allowed for this assessment')

  const questions = await loadQuestions(assessment, { privateKey: true })
  const totalMarks = questions.reduce((sum, question) => sum + Number(question.marks ?? 1), 0)
  const attempt = await AssessmentResult.create({
    employeeId: userId,
    assessmentId,
    status: 'IN_PROGRESS',
    startedAt: new Date(),
    answers: [],
    score: 0,
    total: totalMarks,
    percentage: 0,
    correct: 0,
    incorrect: 0,
    unattempted: questions.length,
  })
  return { ...(await getAttempt(userId, attempt._id)), attemptId: attempt._id }
}

export async function getAssessment(id) {
  const assessment = await loadAssessment(id)
  const questions = await loadQuestions(assessment)
  return { ...assessment.toObject(), questionCount: questions.length, questions: questions.map(publicQuestion) }
}

export async function getAttempt(userId, attemptId) {
  requireObjectId(attemptId, 'attempt ID')
  const attempt = await AssessmentResult.findOne({ _id: attemptId, employeeId: userId }).populate('assessmentId')
  if (!attempt) throw ApiError.notFound('Assessment attempt not found')
  if (attempt.status !== 'IN_PROGRESS') return { ...attempt.toObject(), questions: [] }
  const assessment = attempt.assessmentId
  if (!assessment || !assessment.isActive) throw ApiError.notFound('Assessment not found')
  const questions = await loadQuestions(assessment)
  return {
    attemptId: attempt._id,
    assessment: { id: assessment._id, title: assessment.title, category: assessment.category, duration: assessment.duration, durationLabel: assessment.durationLabel },
    status: attempt.status,
    startedAt: attempt.startedAt,
    answers: attempt.answers.map((answer) => ({ questionId: String(answer.questionId), selected: answer.selected })),
    questions: questions.map(publicQuestion),
  }
}

export async function saveAttemptAnswers(userId, attemptId, answers) {
  requireObjectId(attemptId, 'attempt ID')
  if (!Array.isArray(answers)) throw ApiError.badRequest('Answers must be a list')
  const attempt = await AssessmentResult.findOne({ _id: attemptId, employeeId: userId, status: 'IN_PROGRESS' }).populate('assessmentId')
  if (!attempt) throw ApiError.notFound('In-progress attempt not found')
  const questions = await loadQuestions(attempt.assessmentId, { privateKey: true })
  const validQuestions = new Map(questions.map((q) => [String(q._id), q]))
  const seen = new Set()
  const normalized = []
  for (const answer of answers) {
    if (!answer || typeof answer !== 'object' || !mongoose.isValidObjectId(answer.questionId)) throw ApiError.badRequest('Each answer must include a valid question ID')
    const questionId = String(answer.questionId)
    const question = validQuestions.get(questionId)
    if (!question) throw ApiError.badRequest('Answer contains a question outside this assessment')
    if (seen.has(questionId)) throw ApiError.badRequest('A question may only be answered once')
    seen.add(questionId)
    const selected = answer.selected === undefined || answer.selected === null || answer.selected === '' ? null : Number(answer.selected)
    if (selected !== null && (!Number.isInteger(selected) || selected < 0 || selected >= question.options.length)) throw ApiError.badRequest('Selected option index is invalid')
    normalized.push({ questionId: question._id, selected })
  }
  const updated = await AssessmentResult.findOneAndUpdate(
    { _id: attempt._id, employeeId: userId, status: 'IN_PROGRESS' },
    { $set: { answers: normalized } },
    { new: true, runValidators: true },
  )
  if (!updated) throw ApiError.conflict('Attempt is no longer in progress')
  return { attemptId: attempt._id, savedAnswers: normalized.length }
}

export async function submitAttempt(userId, attemptId) {
  requireObjectId(attemptId, 'attempt ID')
  const attempt = await AssessmentResult.findOne({ _id: attemptId, employeeId: userId, status: 'IN_PROGRESS' }).populate('assessmentId')
  if (!attempt) {
    if (await AssessmentResult.exists({ _id: attemptId, employeeId: userId, status: { $ne: 'IN_PROGRESS' } })) throw ApiError.conflict('Attempt has already been submitted')
    throw ApiError.notFound('In-progress attempt not found')
  }
  const assessment = attempt.assessmentId
  const questions = await loadQuestions(assessment, { privateKey: true })
  const saved = new Map(attempt.answers.map((answer) => [String(answer.questionId), answer.selected]))
  const answers = questions.map((question) => ({ questionId: question._id, selected: saved.get(String(question._id)) ?? null }))
  const scored = scoreAttempt({ questions, answers })
  const skillPerformance = skillWisePerformance(questions, answers)
  const weakSkills = skillPerformance.filter((skill) => skill.value < WEAK_SKILL_THRESHOLD && skill.skillId).map((skill) => skill.skillId)

  const submittedAt = new Date()
  const completed = await AssessmentResult.findOneAndUpdate(
    { _id: attempt._id, employeeId: userId, status: 'IN_PROGRESS' },
    { $set: {
      answers,
      status: 'COMPLETED',
      score: scored.score,
      total: scored.total,
      percentage: scored.percentage,
      correct: scored.correct,
      incorrect: scored.incorrect,
      unattempted: scored.unattempted,
      skillPerformance,
      weakSkills,
      submittedAt,
      completedAt: submittedAt,
    } },
    { new: true, runValidators: true },
  )
  if (!completed) throw ApiError.conflict('Attempt has already been submitted')

  try {
    const employeeSkills = await EmployeeSkill.find({ employeeId: userId }).populate('skillId')
    applyAssessmentToSkills(employeeSkills, skillPerformance)
    await Promise.all(employeeSkills.map((row) => row.save()))
    const profile = await EmployeeProfile.findOne({ userId })
    if (profile) {
      profile.competencyScore = mapCompetencyScore(employeeSkills)
      await profile.save()
    }
  } catch (error) {
    console.error('[assessment] skill progress update failed', error.message)
  }
  const sideEffects = await Promise.allSettled([
    generateRecommendations(userId),
    generateLearningPath(userId),
    notify(userId, {
      type: 'assessment',
      title: 'Assessment completed',
      message: `You scored ${scored.score}/${scored.total} (${scored.percentage}%) in ${assessment.title}.`,
      metadata: { assessmentId: assessment._id, resultId: attempt._id },
    }),
  ])
  sideEffects.filter((item) => item.status === 'rejected').forEach((item) => console.error('[assessment] post-submit update failed', item.reason?.message))
  return completed
}

export async function getAssessmentResult(userId, resultId) {
  requireObjectId(resultId, 'result ID')
  const result = await AssessmentResult.findOne({ _id: resultId, employeeId: userId, $or: [{ status: 'COMPLETED' }, { status: { $exists: false } }] })
    .populate('weakSkills', 'name category')
    .populate('assessmentId', 'title category passingScore')
  if (!result) throw ApiError.notFound('Assessment result not found')
  return result
}

export async function listAssessmentHistory(userId, { assessmentId, limit = 50 } = {}) {
  if (!Number.isInteger(Number(limit)) || Number(limit) < 1) throw ApiError.badRequest('Limit must be a positive integer')
  const filter = { employeeId: userId, $or: [{ status: 'COMPLETED' }, { status: { $exists: false } }] }
  if (assessmentId) {
    requireObjectId(assessmentId, 'assessment ID')
    filter.assessmentId = assessmentId
  }
  return AssessmentResult.find(filter)
    .populate('assessmentId', 'title category passingScore')
    .populate('weakSkills', 'name category')
    .sort({ completedAt: -1 })
    .limit(Math.min(Number(limit), 100))
    .lean()
}
