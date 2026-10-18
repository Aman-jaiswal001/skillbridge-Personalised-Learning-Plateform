import mongoose from 'mongoose'
import { Assessment } from '../models/Assessment.js'
import { Question } from '../models/Question.js'
import { AssessmentResult } from '../models/AssessmentResult.js'
import { EmployeeSkill } from '../models/EmployeeSkill.js'
import { Skill } from '../models/Skill.js'
import { ApiError } from '../utils/ApiError.js'
import { scoreAttempt, skillWisePerformance } from '../utils/scoring.js'
import { listMySkills } from './employee.service.js'
import { isMasteryLevelUnlocked, MASTERY_LEVELS, matchesSkillLabel, normalizeMasteryLevel, startingMasteryLevel, unlockedMasteryLevel, updateMasteryUnlock } from '../utils/skillProgress.js'
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

function normalizeSkillName(value) {
  return String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

function assessmentNamesSkill(assessment, skill) {
  const name = normalizeSkillName(skill?.name)
  if (!name) return false
  const text = `${assessment.title || ''} ${assessment.category || ''} ${assessment.description || ''}`
  return normalizeSkillName(text).includes(name)
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
  const assessment = await Assessment.findOne({ _id: id, isActive: true, isPublished: { $ne: false } }).populate('skills', 'name')
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

async function requireAssessmentUnlocked(userId, assessment, questions) {
  const level = normalizeMasteryLevel(assessment.level, assessment.difficulty)
  const linkedIds = new Set((assessment.skills || []).map((skill) => String(skill._id || skill)))
  for (const question of questions) if (question.skillId?._id || question.skillId) linkedIds.add(String(question.skillId?._id || question.skillId))
  if (!linkedIds.size) {
    const names = [...new Set(questions.map((question) => question.skill || question.category).filter(Boolean))]
    const linked = await Skill.find({ name: { $in: names.length ? names : [assessment.category] } }).select('_id').lean()
    linked.forEach((skill) => linkedIds.add(String(skill._id)))
  }
  const titleMatches = await Skill.find().select('_id name').lean()
  titleMatches.filter((skill) => assessmentNamesSkill(assessment, skill)).forEach((skill) => linkedIds.add(String(skill._id)))
  if (!linkedIds.size) return
  if (!linkedIds.size) return
  const enrollments = await EmployeeSkill.find({ employeeId: userId, skillId: { $in: [...linkedIds] } }).lean()
  if (!enrollments.length) throw ApiError.forbidden('Add this skill to My Skills before starting its mastery assessment')
  for (const enrollment of enrollments) {
    const unlocked = unlockedMasteryLevel(enrollment)
    if (!isMasteryLevelUnlocked(level, unlocked)) throw ApiError.forbidden(`${level} is locked. Pass the previous level assessment for this skill first.`)
  }
}

export async function listAssessments(userId, query = {}) {
  const [assessments, attempts] = await Promise.all([
    Assessment.find({ isActive: true, isPublished: { $ne: false } }).populate('skills', 'name').lean(),
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
  const studentSkills = await EmployeeSkill.find({ employeeId: userId }).populate('skillId', 'name').lean()
  const allSkills = await Skill.find().select('_id name').lean()
  const assessmentById = new Map(assessments.map((assessment) => [String(assessment._id), assessment]))
  for (const enrollment of studentSkills) {
    const skillId = String(enrollment.skillId?._id || enrollment.skillId)
    const skillName = enrollment.skillId?.name
    let progress = { ...enrollment, startingLevel: startingMasteryLevel(enrollment), passedLevels: enrollment.passedLevels || [] }
    for (const attempt of attempts.slice().reverse()) {
      if (attempt.status !== 'COMPLETED' && attempt.status !== undefined) continue
      const attemptedAssessment = assessmentById.get(String(attempt.assessmentId))
      if (!attemptedAssessment) continue
      const explicitlyLinked = (attemptedAssessment.skills || []).some((skill) => String(skill._id || skill) === skillId)
      if (!explicitlyLinked && !assessmentNamesSkill(attemptedAssessment, { name: skillName })) continue
      const performance = (attempt.skillPerformance || []).find((row) => (row.skillId && String(row.skillId) === skillId) || matchesSkillLabel(row.name, skillName))
      const passed = performance?.passed ?? (attempt.passed ?? Number(attempt.percentage || 0) >= Number(attempt.passingScore || attemptedAssessment.passingScore || 70))
      progress = updateMasteryUnlock(progress, attempt.assessmentLevel || normalizeMasteryLevel(attemptedAssessment.level, attemptedAssessment.difficulty), passed)
    }
    if (progress.unlockedLevel !== (enrollment.unlockedLevel || enrollment.startingLevel || 'Beginner') || JSON.stringify([...progress.passedLevels].sort()) !== JSON.stringify([...(enrollment.passedLevels || [])].sort())) {
      await EmployeeSkill.updateOne({ _id: enrollment._id }, { $set: { unlockedLevel: progress.unlockedLevel, passedLevels: progress.passedLevels, startingLevel: progress.startingLevel } })
      enrollment.unlockedLevel = progress.unlockedLevel
      enrollment.passedLevels = progress.passedLevels
      enrollment.startingLevel = progress.startingLevel
    }
  }
  const result = await Promise.all(assessments.map(async (assessment) => {
    const entry = byAssessment.get(String(assessment._id)) || { latest: null, completed: [] }
    const latestCompleted = entry.completed[0] || null
    const inProgress = entry.latest?.status === 'IN_PROGRESS' ? entry.latest : null
    const level = normalizeMasteryLevel(assessment.level, assessment.difficulty)
    const linkedIds = new Set((assessment.skills || []).map((skill) => String(skill._id)))
    const linkedQuestionSkills = await Question.find({ assessmentId: assessment._id, skillId: { $exists: true } }).distinct('skillId')
    linkedQuestionSkills.forEach((id) => linkedIds.add(String(id)))
    let linkedSkills = allSkills.filter((skill) => linkedIds.has(String(skill._id)))
    const linkedSkillIds = new Set(linkedSkills.map((skill) => String(skill._id)))
    for (const skill of allSkills.filter((item) => assessmentNamesSkill(assessment, item))) {
      if (!linkedSkillIds.has(String(skill._id))) linkedSkills.push(skill)
    }
    const mastery = linkedSkills.map((linkedSkill) => {
      const enrollment = studentSkills.find((row) => String(row.skillId?._id || row.skillId) === String(linkedSkill._id))
      const unlockedLevel = enrollment ? unlockedMasteryLevel(enrollment) : 'Beginner'
      return { skillId: linkedSkill._id, skill: linkedSkill.name, unlockedLevel, requiresEnrollment: !enrollment, locked: enrollment ? !isMasteryLevelUnlocked(level, unlockedLevel) : true }
    })
    const enrolledMastery = mastery.filter((row) => !row.requiresEnrollment)
    const locked = enrolledMastery.length ? enrolledMastery.some((row) => row.locked) : mastery.length > 0
    return {
      ...assessment,
      level,
      passingScore: assessment.passingScore ?? 70,
      mastery,
      locked,
      lockReason: !locked ? null : enrolledMastery.length ? 'LEVEL' : 'ENROLLMENT',
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
        passed: latestCompleted.passed ?? latestCompleted.percentage >= (assessment.passingScore ?? 70),
        assessmentLevel: latestCompleted.assessmentLevel || level,
        completedAt: latestCompleted.completedAt || latestCompleted.submittedAt,
      } : null,
    }
  }))
  return result.filter((assessment) => {
    if (query.level && assessment.level !== query.level) return false
    if (query.skillId && !assessment.mastery.some((row) => String(row.skillId) === String(query.skillId))) return false
    return true
  })
}

function normalizeAssessmentInput(input) {
  const title = String(input.title || '').trim()
  const topic = String(input.topic || input.category || '').trim()
  const description = String(input.description || '').trim()
  const requestedDifficulty = input.difficulty || 'Medium'
  const duration = Number(input.duration || 30)
  if (input.level && !MASTERY_LEVELS.includes(input.level)) throw ApiError.badRequest('Choose Beginner, Intermediate, or Advanced level')
  const level = normalizeMasteryLevel(input.level, input.difficulty)
  const difficulty = ({ Beginner: 'Easy', Intermediate: 'Medium', Advanced: 'Hard' })[level]
  const passingScore = Number(input.passingScore ?? 70)
  if (!title || title.length > 160) throw ApiError.badRequest('Assessment title is required (up to 160 characters)')
  if (!topic || topic.length > 120) throw ApiError.badRequest('Assessment topic is required (up to 120 characters)')
  if (!['Easy', 'Medium', 'Hard'].includes(requestedDifficulty)) throw ApiError.badRequest('Choose a valid assessment level')
  if (!Number.isInteger(duration) || duration < 1 || duration > 300) throw ApiError.badRequest('Duration must be from 1 to 300 minutes')
  if (!Number.isFinite(passingScore) || passingScore < 0 || passingScore > 100) throw ApiError.badRequest('Passing score must be between 0 and 100')
  if (!Array.isArray(input.questions) || input.questions.length < 1 || input.questions.length > 100) throw ApiError.badRequest('Add between 1 and 100 questions')
  const questions = input.questions.map((item, index) => {
    const question = String(item?.question || '').trim()
    const options = Array.isArray(item?.options) ? item.options.map((option) => String(option || '').trim()) : []
    const correctAnswer = item?.correctAnswer === '' || item?.correctAnswer === undefined || item?.correctAnswer === null
      ? Number.NaN
      : Number(item.correctAnswer)
    const questionDifficulty = difficulty
    if (!question) throw ApiError.badRequest(`Question ${index + 1} is required`)
    if (options.length !== 4 || options.some((option) => !option)) throw ApiError.badRequest(`Question ${index + 1} must have four non-empty choices`)
    if (!Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) throw ApiError.badRequest(`Choose the correct answer for question ${index + 1}`)
    if (!['Easy', 'Medium', 'Hard'].includes(questionDifficulty)) throw ApiError.badRequest(`Question ${index + 1} has an invalid difficulty`)
    return { question, options, correctAnswer, difficulty: questionDifficulty, category: topic, skill: topic, marks: 1 }
  })
  const skillIds = Array.isArray(input.skillIds) ? input.skillIds : input.skillId ? [input.skillId] : []
  if (skillIds.some((id) => !mongoose.isValidObjectId(id))) throw ApiError.badRequest('Choose valid associated skills')
  for (const item of input.questions) if (item?.skillId && !mongoose.isValidObjectId(item.skillId)) throw ApiError.badRequest('Choose a valid question skill')
  return { title, category: topic, skillIds, description, difficulty, level, duration, durationLabel: `${duration} min`, passingScore, allowRetakes: input.allowRetakes !== false, questions }
}

async function findSkills(data) {
  if (data.skillIds.length) return Skill.find({ _id: { $in: data.skillIds } }).select('_id name')
  const fallback = await Skill.findOne({ name: String(data.category).trim() }).select('_id name')
  return fallback ? [fallback] : []
}

function questionSkill(question, skills) {
  if (question.skillId) return skills.find((skill) => String(skill._id) === String(question.skillId))
  return skills.find((skill) => skill.name.toLowerCase() === String(question.skill || '').trim().toLowerCase()) || (skills.length === 1 ? skills[0] : null)
}

export async function listAdminAssessments() {
  const assessments = await Assessment.find().populate('questions').populate('skills', 'name').sort({ updatedAt: -1 }).lean()
  return Promise.all(assessments.map(async (assessment) => ({
    ...assessment,
    level: normalizeMasteryLevel(assessment.level, assessment.difficulty),
    attemptCount: await AssessmentResult.countDocuments({ assessmentId: assessment._id }),
  })))
}

export async function createAssessment(input) {
  const data = normalizeAssessmentInput(input)
  const skills = await findSkills(data)
  if (!skills.length) throw ApiError.badRequest('Select at least one associated skill')
  const assessment = await Assessment.create({
    title: data.title,
    category: data.category,
    description: data.description,
    difficulty: data.difficulty,
    level: data.level,
    skills: skills.map((skill) => skill._id),
    duration: data.duration,
    durationLabel: data.durationLabel,
    passingScore: data.passingScore,
    allowRetakes: data.allowRetakes,
    status: 'Upcoming',
    isActive: true,
    isPublished: false,
    questions: [],
  })
  let questions = []
  try {
    questions = await Question.insertMany(data.questions.map((question) => { const skill = questionSkill(question, skills); return { ...question, ...(skill ? { skillId: skill._id, skill: skill.name } : {}), assessmentId: assessment._id } }))
    assessment.questions = questions.map((question) => question._id)
    await assessment.save()
    return { ...assessment.toObject(), questions }
  } catch (error) {
    if (questions.length) await Question.deleteMany({ _id: { $in: questions.map((question) => question._id) } }).catch(() => {})
    await Assessment.deleteOne({ _id: assessment._id }).catch(() => {})
    throw error
  }
}

export async function updateAssessment(id, input) {
  requireObjectId(id, 'assessment ID')
  const assessment = await Assessment.findById(id)
  if (!assessment) throw ApiError.notFound('Assessment not found')
  if (await AssessmentResult.exists({ assessmentId: id })) throw ApiError.conflict('An assessment with student attempts cannot be edited. Create a new assessment to preserve its history.')
  const data = normalizeAssessmentInput(input)
  const skills = await findSkills(data)
  if (!skills.length) throw ApiError.badRequest('Select at least one associated skill')
  const previousQuestionIds = assessment.questions
  let questions = []
  try {
    questions = await Question.insertMany(data.questions.map((question) => { const skill = questionSkill(question, skills); return { ...question, ...(skill ? { skillId: skill._id, skill: skill.name } : {}), assessmentId: assessment._id } }))
    Object.assign(assessment, {
      title: data.title,
      category: data.category,
      description: data.description,
      difficulty: data.difficulty,
      level: data.level,
      skills: skills.map((skill) => skill._id),
      duration: data.duration,
      durationLabel: data.durationLabel,
      passingScore: data.passingScore,
      allowRetakes: data.allowRetakes,
      questions: questions.map((question) => question._id),
    })
    await assessment.save()
  } catch (error) {
    if (questions.length) await Question.deleteMany({ _id: { $in: questions.map((question) => question._id) } }).catch(() => {})
    throw error
  }
  if (previousQuestionIds.length) await Question.deleteMany({ _id: { $in: previousQuestionIds } }).catch((error) => console.error('[assessment] obsolete question cleanup failed', error.message))
  return { ...assessment.toObject(), questions }
}

export async function setAssessmentPublished(id, published) {
  requireObjectId(id, 'assessment ID')
  if (typeof published !== 'boolean') throw ApiError.badRequest('published must be true or false')
  const assessment = await Assessment.findById(id)
  if (!assessment) throw ApiError.notFound('Assessment not found')
  if (published && !assessment.questions?.length) throw ApiError.badRequest('Add questions before publishing this assessment')
  assessment.isPublished = published
  assessment.isActive = true
  assessment.status = published ? 'Active' : 'Upcoming'
  await assessment.save()
  return assessment
}

export async function archiveAssessment(id) {
  requireObjectId(id, 'assessment ID')
  const assessment = await Assessment.findByIdAndUpdate(id, { isActive: false, isPublished: false }, { new: true })
  if (!assessment) throw ApiError.notFound('Assessment not found')
  return assessment
}

export async function startAttempt(userId, assessmentId) {
  const assessment = await loadAssessment(assessmentId)
  const unlockedQuestions = await loadQuestions(assessment)
  await requireAssessmentUnlocked(userId, assessment, unlockedQuestions)
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
    assessmentLevel: normalizeMasteryLevel(assessment.level, assessment.difficulty),
    passingScore: assessment.passingScore ?? 70,
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

export async function getAssessment(id, userId) {
  const assessment = await loadAssessment(id)
  const questions = await loadQuestions(assessment)
  if (userId) await requireAssessmentUnlocked(userId, assessment, questions)
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
  const assessmentLevel = normalizeMasteryLevel(assessment.level, assessment.difficulty)
  const passingScore = assessment.passingScore ?? 70
  const passed = scored.percentage >= passingScore
  const skillPerformance = skillWisePerformance(questions, answers).map((row) => ({ ...row, level: assessmentLevel, passingScore, passed: row.value >= passingScore }))
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
      assessmentLevel,
      passingScore,
      passed,
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
    const studentSkills = await EmployeeSkill.find({ employeeId: userId }).populate('skillId', 'name')
    for (const employeeSkill of studentSkills) {
      const assessed = skillPerformance.find((row) => (row.skillId && String(row.skillId) === String(employeeSkill.skillId?._id || employeeSkill.skillId)) || matchesSkillLabel(row.name, employeeSkill.skillId?.name))
      if (!assessed) continue
      const progress = updateMasteryUnlock(employeeSkill.toObject(), assessmentLevel, assessed.passed)
      employeeSkill.passedLevels = progress.passedLevels
      employeeSkill.unlockedLevel = progress.unlockedLevel
      employeeSkill.lastAssessedAt = submittedAt
      await employeeSkill.save()
    }
    // Rebuild proficiency from stored attempts before refreshing personalized recommendations/path.
    await listMySkills(userId)
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
    .populate('assessmentId', 'title category passingScore level difficulty')
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
    .populate('assessmentId', 'title category passingScore level difficulty')
    .populate('weakSkills', 'name category')
    .sort({ completedAt: -1 })
    .limit(Math.min(Number(limit), 100))
    .lean()
}
