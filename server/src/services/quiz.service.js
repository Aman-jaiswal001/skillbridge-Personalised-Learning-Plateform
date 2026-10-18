import { Quiz } from '../models/Quiz.js'
import { QuizAttempt } from '../models/QuizAttempt.js'
import mongoose from 'mongoose'
import { YouTubeLearningItem } from '../models/YouTubeLearningItem.js'
import { YouTubeResource } from '../models/YouTubeResource.js'
import { Document } from '../models/Document.js'
import { ApiError } from '../utils/ApiError.js'
import { retrieveContext } from '../ai/rag/retrieve.service.js'
import { runQuizGenerationChain, runLessonQuizGeneration } from '../ai/chains/quizGeneration.chain.js'
import { scoreAttempt, identifyWeakTopics } from '../utils/scoring.js'
import { generateRecommendations } from './recommendation.service.js'
import { generateLearningPath } from './learningPath.service.js'
import { notify } from './notification.service.js'
import { aiConfig } from '../config/ai.js'

function publicQuiz(quiz) {
  const obj = quiz.toObject ? quiz.toObject() : quiz
  return {
    ...obj,
    questions: (obj.questions || []).map((q) => ({
      id: q._id,
      question: q.question,
      options: q.options,
      topic: q.topic,
      tags: q.tags,
      difficulty: q.difficulty,
      source: q.source,
    })),
  }
}

function assertObjectId(id, label = 'quiz') {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest(`Invalid ${label} identifier`)
}

function topicPerformance(questions, answers) {
  const groups = new Map()
  questions.forEach((question, index) => {
    const topic = question.topic || 'General'
    const row = groups.get(topic) || { topic, correct: 0, total: 0 }
    row.total += 1
    if (Number(answers[index]) === Number(question.correctAnswer)) row.correct += 1
    groups.set(topic, row)
  })
  return [...groups.values()].map((row) => ({ ...row, percentage: Math.round(row.correct / row.total * 100) }))
}

export async function generateYouTubeQuiz(userId, learningItemId) {
  assertObjectId(learningItemId, 'learning item')
  const item = await YouTubeLearningItem.findOne({ _id: learningItemId, userId })
  if (!item) throw ApiError.notFound('Learning item not found')
  let quiz = await Quiz.findOne({ youtubeLearningItemId: item._id, status: 'ready' }).sort({ createdAt: -1 })
  const activeResource = item.resourceId ? await YouTubeResource.findOne({ _id: item.resourceId, isPublished: true }).lean() : null
  const resource = activeResource || item.resource.toObject?.() || item.resource
  if (!quiz && !resource) throw ApiError.notFound('Saved lesson metadata is unavailable')
  if (!quiz || quiz.questions.length < 5 || quiz.questions.some((question) => question.options.length !== 4)) {
    const context = [
      `Lesson description: ${resource.description || 'Not provided.'}`,
      `Subtopics: ${(resource.subtopics || []).join(', ') || 'Not provided.'}`,
      `Learning objectives: ${(resource.objectives || []).join('; ') || 'Not provided.'}`,
      `Skills: ${(resource.skills || []).join(', ') || 'Not provided.'}`,
      `Category: ${resource.category}`,
    ].join('\n')
    const questions = await runLessonQuizGeneration({
      topic: resource.title,
      difficulty: resource.difficulty === 'Beginner' ? 'Easy' : resource.difficulty === 'Advanced' ? 'Hard' : 'Medium',
      numberOfQuestions: 5,
      context,
    })
    const quizData = {
      createdBy: userId,
      title: `${resource.title} Quiz`,
      topic: resource.title,
      difficulty: resource.difficulty === 'Beginner' ? 'Easy' : resource.difficulty === 'Advanced' ? 'Hard' : 'Medium',
      questionType: 'MCQ',
      questions,
      totalQuestions: questions.length,
      youtubeResourceId: resource._id,
      youtubeLearningItemId: item._id,
      contentSource: 'metadata',
      sourceLabel: 'Generated from saved lesson description and learning metadata; no transcript was available.',
      status: 'ready',
    }
    if (quiz) {
      Object.assign(quiz, quizData)
      await quiz.save()
    } else {
      try { quiz = await Quiz.create(quizData) }
      catch (error) {
        if (error.code !== 11000) throw error
        quiz = await Quiz.findOne({ youtubeLearningItemId: item._id, status: 'ready' })
        if (!quiz) throw error
      }
    }
  }
  return { ...publicQuiz(quiz), contentSource: quiz.contentSource, sourceLabel: quiz.sourceLabel }
}

export async function generateQuiz(userId, payload) {
  const numberOfQuestions = Math.min(aiConfig.quizMaxQuestions, Math.max(1, Number(payload.numberOfQuestions) || 10))
  const topic = payload.topic || 'Official Statistics'
  const difficulty = payload.difficulty || 'Medium'
  const questionType = payload.questionType || 'MCQ'
  const documentIds = payload.documentIds || []

  if (documentIds.length) {
    const ready = await Document.countDocuments({ _id: { $in: documentIds }, status: 'ready' })
    if (!ready) throw ApiError.badRequest('Documents must be processed before generating a quiz')
  }

  const chunks = await retrieveContext({
    question: `${topic} sampling methods statistics survey design`,
    documentIds: documentIds.length ? documentIds : undefined,
    k: 12,
  })
  if (!chunks.length && documentIds.length) {
    throw ApiError.badRequest('No retrievable content found in the selected documents')
  }

  const generated = await runQuizGenerationChain({
    topic,
    difficulty,
    questionType,
    numberOfQuestions,
    chunks: chunks.length
      ? chunks
      : [{ content: `${topic} is a core competency in official statistics, sampling and survey operations.`, pageNumber: 1 }],
  })

  const questions = generated.map((q) => ({
    ...q,
    source: {
      documentId: chunks[0]?.documentId,
      fileName: chunks[0]?.metadata?.fileName,
      pageNumber: q.pageNumber || chunks[0]?.pageNumber || 1,
    },
  }))

  const quiz = await Quiz.create({
    createdBy: userId,
    documentIds,
    title: `${topic} Quiz`,
    topic,
    difficulty,
    questionType,
    questions,
    totalQuestions: questions.length,
    status: 'ready',
  })
  return publicQuiz(quiz)
}

export async function listQuizzes(userId) {
  return Quiz.find({ createdBy: userId }).sort({ createdAt: -1 }).select('-questions.correctAnswer -questions.explanation').lean()
}

export async function getQuiz(userId, id) {
  assertObjectId(id)
  const quiz = await Quiz.findById(id)
  if (!quiz) throw ApiError.notFound('Quiz not found')
  if (String(quiz.createdBy) !== String(userId)) {
    const attempt = await QuizAttempt.findOne({ quizId: id, employeeId: userId })
    if (!attempt) throw ApiError.forbidden('Quiz not available')
  }
  if (quiz.youtubeLearningItemId && !(await YouTubeLearningItem.exists({ _id: quiz.youtubeLearningItemId, userId }))) throw ApiError.forbidden('Quiz not available')
  return publicQuiz(quiz)
}

export async function submitQuiz(userId, quizId, answers, submissionKey) {
  assertObjectId(quizId)
  if (!Array.isArray(answers)) throw ApiError.badRequest('Answers must be a list')
  const quiz = await Quiz.findById(quizId)
  if (!quiz) throw ApiError.notFound('Quiz not found')
  if (String(quiz.createdBy) !== String(userId) && !(await QuizAttempt.exists({ quizId, employeeId: userId })) && !(quiz.youtubeLearningItemId && await YouTubeLearningItem.exists({ _id: quiz.youtubeLearningItemId, userId }))) throw ApiError.forbidden('Quiz not available')
  const questions = quiz.questions
  if (answers.length !== questions.length) throw ApiError.badRequest('Submit one answer slot per question')
  if (quiz.youtubeLearningItemId && !(await YouTubeLearningItem.exists({ _id: quiz.youtubeLearningItemId, userId }))) throw ApiError.forbidden('Quiz not available')
  if (submissionKey !== undefined && (typeof submissionKey !== 'string' || !/^[\w-]{8,80}$/.test(submissionKey))) throw ApiError.badRequest('Invalid submission key')
  if (submissionKey) {
    const previous = await QuizAttempt.findOne({ employeeId: userId, submissionKey })
    if (previous) {
      if (String(previous.quizId) !== String(quizId)) throw ApiError.conflict('Submission key already used')
      if (quiz.youtubeLearningItemId) return youtubeAttemptResult(previous, quiz)
      return previous
    }
  }
  const normalized = questions.map((q, index) => {
    if (quiz.youtubeResourceId && (!answers[index] || String(answers[index].questionId) !== String(q._id))) throw ApiError.badRequest(`Question identifier mismatch at question ${index + 1}`)
    const raw = answers[index]?.selected ?? answers[index] ?? null
    const value = raw === null || raw === '' ? null : Number(raw)
    if (value !== null && (!Number.isInteger(value) || value < 0 || value >= q.options.length)) throw ApiError.badRequest(`Invalid option for question ${index + 1}`)
    return { selected: value }
  })
  const scored = scoreAttempt({ questions, answers: normalized })
  const weakTopics = identifyWeakTopics(questions, normalized)
  const perTopic = topicPerformance(questions, normalized.map((answer) => answer.selected))
  const questionPerformance = questions.map((q, i) => ({
    q: `Q${i + 1}`,
    score: Number(normalized[i].selected) === Number(q.correctAnswer) ? 1 : 0,
  }))

  let attempt
  try { attempt = await QuizAttempt.create({
    quizId,
    employeeId: userId,
    youtubeLearningItemId: quiz.youtubeLearningItemId || null,
    submissionKey: submissionKey || null,
    answers: normalized.map((a) => a.selected),
    total: scored.total,
    ...scored,
    weakTopics,
    topicPerformance: perTopic,
    questionPerformance,
    completedAt: new Date(),
  }) } catch (error) {
    if (error.code !== 11000 || !submissionKey) throw error
    attempt = await QuizAttempt.findOne({ employeeId: userId, submissionKey })
    if (!attempt || String(attempt.quizId) !== String(quizId)) throw ApiError.conflict('Submission key already used')
    if (quiz.youtubeLearningItemId) return youtubeAttemptResult(attempt, quiz)
    return attempt
  }

  await generateRecommendations(userId)
  await generateLearningPath(userId)
  await notify(userId, {
    type: 'assessment',
    title: 'Quiz completed',
    message: `You scored ${scored.score}/${scored.total} on ${quiz.title}.`,
    metadata: { quizId, attemptId: attempt._id },
  })
  if (quiz.youtubeLearningItemId) {
    const recommendation = await recommendNextLesson(userId, quiz.youtubeLearningItemId, scored.percentage, weakTopics)
    attempt.recommendation = recommendation
    await attempt.save()
    return youtubeAttemptResult(attempt, quiz)
  }
  return attempt
}

function youtubeAttemptResult(attempt, quiz) {
  const obj = attempt.toObject ? attempt.toObject() : attempt
  return {
    ...obj,
    quiz: { _id: quiz._id, title: quiz.title, contentSource: quiz.contentSource, sourceLabel: quiz.sourceLabel },
    contentSource: quiz.contentSource,
    sourceLabel: quiz.sourceLabel,
    recommendation: obj.recommendation,
    review: quiz.questions.map((question, index) => ({
      question: question.question,
      options: question.options,
      selected: obj.answers[index],
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      topic: question.topic,
      tags: question.tags,
      difficulty: question.difficulty,
    })),
  }
}

export async function recommendNextLesson(userId, learningItemId, percentage, weakTopics = []) {
  const current = await YouTubeLearningItem.findOne({ _id: learningItemId, userId })
  if (!current) throw ApiError.notFound('Learning item not found')
  const currentSkills = current.resource.skills || []
  const weakTerms = weakTopics.map((term) => term.toLowerCase())
  const candidates = await YouTubeResource.find({ isPublished: true, _id: { $ne: current.resourceId } }).lean()
  const existingItems = await YouTubeLearningItem.find({ userId }).select('resourceId resource.skills resource.title status').lean()
  const existingIds = new Set(existingItems.map((entry) => String(entry.resourceId)).filter(Boolean))
  const completed = existingItems.filter((entry) => entry.status === 'Completed')
  const knownSkills = new Set(completed.flatMap((entry) => entry.resource.skills || []).map((value) => value.toLowerCase()))
  const scored = candidates.map((resource) => {
    const tags = [...(resource.skills || []), ...(resource.subtopics || []), resource.category].filter(Boolean).map((tag) => tag.toLowerCase())
    const weakMatch = tags.some((tag) => weakTerms.some((weak) => tag.includes(weak) || weak.includes(tag)))
    const relevant = tags.some((tag) => currentSkills.some((skill) => skill.toLowerCase() === tag) || weakTerms.some((weak) => tag.includes(weak)))
    const difficultyRank = { Beginner: 0, Intermediate: 1, Advanced: 2 }
    const harder = (difficultyRank[resource.difficulty] ?? 0) > (difficultyRank[current.resource.difficulty] ?? 0)
    const prerequisitesMet = (resource.prerequisites || []).every((required) => knownSkills.has(required.toLowerCase()))
    let score = (weakMatch ? 10 : 0) + (relevant ? 3 : 0) + (percentage >= 80 && harder ? 2 : 0) + (prerequisitesMet ? 1 : -8) - (existingIds.has(String(resource._id)) ? 4 : 0)
    if (percentage < 50 && !weakMatch) score -= 2
    return { resource, score, weakMatch, harder, prerequisitesMet }
  }).filter((entry) => entry.prerequisitesMet).sort((a, b) => b.score - a.score)
  const best = scored[0]
  if (percentage < aiConfig.quizReviewThreshold) return { strategy: 'rule-based', action: 'review', reason: `Your score was below ${aiConfig.quizReviewThreshold}%. Review this lesson and practice its basic concepts.`, learningItemId: current._id, title: current.resource.title }
  if (!best || best.score < 1) return { strategy: 'rule-based', action: 'review', reason: 'No suitable published lesson is available yet. Review the weak topics in this lesson.', resource: null }
  const reason = percentage < aiConfig.quizAdvanceThreshold
    ? `Your ${percentage}% score suggests more practice. This published lesson matches ${best.weakMatch ? 'a weak topic' : 'the lesson skills'}.`
    : `Your ${percentage}% score shows strong understanding. This published lesson${best.harder ? ' advances the difficulty' : ' builds on the same skills'} and its prerequisites are met.`
  return { strategy: 'rule-based', action: 'next-lesson', reason, thresholds: { review: aiConfig.quizReviewThreshold, advance: aiConfig.quizAdvanceThreshold }, resource: best.resource }
}

export async function performanceSummary(userId) {
  const match = { employeeId: new mongoose.Types.ObjectId(String(userId)) }
  const [attempts, completedQuizzes, scoreRows, topicTotals] = await Promise.all([
    QuizAttempt.find(match).populate('quizId', 'title topic youtubeLearningItemId').sort({ completedAt: -1 }).limit(100).lean(),
    QuizAttempt.countDocuments(match),
    QuizAttempt.aggregate([{ $match: match }, { $group: { _id: null, average: { $avg: '$percentage' } } }]),
    QuizAttempt.aggregate([
      { $match: match }, { $unwind: '$topicPerformance' },
      { $group: { _id: '$topicPerformance.topic', correct: { $sum: '$topicPerformance.correct' }, total: { $sum: '$topicPerformance.total' } } },
    ]),
  ])
  const topics = topicTotals.map((row) => ({ topic: row._id, correct: row.correct, total: row.total, percentage: row.total ? Math.round(row.correct / row.total * 100) : 0 })).sort((a, b) => b.percentage - a.percentage)
  return { averageScore: Math.round(scoreRows[0]?.average || 0), completedQuizzes, strengths: topics.filter((row) => row.percentage >= 80).slice(0, 5), weakTopics: topics.filter((row) => row.percentage < 60).sort((a, b) => a.percentage - b.percentage).slice(0, 5), recentAttempts: attempts.slice(0, 10) }
}

export async function getQuizResult(userId, quizId) {
  const attempt = await QuizAttempt.findOne({ quizId, employeeId: userId }).sort({ completedAt: -1 })
  if (!attempt) throw ApiError.notFound('Quiz result not found')
  const quiz = await Quiz.findById(quizId)
  return {
    ...attempt.toObject(),
    quiz: publicQuiz(quiz),
    recommendation: attempt.recommendation,
    review: quiz.questions.map((q, i) => ({
      question: q.question,
      options: q.options,
      selected: attempt.answers[i],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      topic: q.topic,
      tags: q.tags,
      difficulty: q.difficulty,
    })),
  }
}

export async function quizHistory(userId, query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20))
  const filter = { employeeId: userId }
  const [data, total] = await Promise.all([
    QuizAttempt.find(filter).populate('quizId', 'title topic').sort({ completedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    QuizAttempt.countDocuments(filter),
  ])
  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }
}
