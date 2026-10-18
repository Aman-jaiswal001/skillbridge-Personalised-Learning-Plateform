import { Quiz } from '../models/Quiz.js'
import { QuizAttempt } from '../models/QuizAttempt.js'
import { Document } from '../models/Document.js'
import { ApiError } from '../utils/ApiError.js'
import { retrieveContext } from '../ai/rag/retrieve.service.js'
import { runQuizGenerationChain } from '../ai/chains/quizGeneration.chain.js'
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
      source: q.source,
    })),
  }
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
  return Quiz.find({ createdBy: userId }).sort({ createdAt: -1 }).select('-questions.correctAnswer').lean()
}

export async function getQuiz(userId, id) {
  const quiz = await Quiz.findById(id)
  if (!quiz) throw ApiError.notFound('Quiz not found')
  if (String(quiz.createdBy) !== String(userId)) {
    const attempt = await QuizAttempt.findOne({ quizId: id, employeeId: userId })
    if (!attempt) throw ApiError.forbidden('Quiz not available')
  }
  return publicQuiz(quiz)
}

export async function submitQuiz(userId, quizId, answers) {
  const quiz = await Quiz.findById(quizId)
  if (!quiz) throw ApiError.notFound('Quiz not found')
  const questions = quiz.questions
  const normalized = questions.map((q, index) => ({
    selected: answers?.[index]?.selected ?? answers?.[index] ?? null,
  }))
  const scored = scoreAttempt({ questions, answers: normalized })
  const weakTopics = identifyWeakTopics(questions, normalized)
  const questionPerformance = questions.map((q, i) => ({
    q: `Q${i + 1}`,
    score: Number(normalized[i].selected) === Number(q.correctAnswer) ? 1 : 0,
  }))

  const attempt = await QuizAttempt.create({
    quizId,
    employeeId: userId,
    answers: normalized.map((a) => a.selected),
    total: scored.total,
    ...scored,
    weakTopics,
    questionPerformance,
    completedAt: new Date(),
  })

  await generateRecommendations(userId)
  await generateLearningPath(userId)
  await notify(userId, {
    type: 'assessment',
    title: 'Quiz completed',
    message: `You scored ${scored.score}/${scored.total} on ${quiz.title}.`,
    metadata: { quizId, attemptId: attempt._id },
  })
  return attempt
}

export async function getQuizResult(userId, quizId) {
  const attempt = await QuizAttempt.findOne({ quizId, employeeId: userId }).sort({ completedAt: -1 })
  if (!attempt) throw ApiError.notFound('Quiz result not found')
  const quiz = await Quiz.findById(quizId)
  return {
    ...attempt.toObject(),
    quiz: publicQuiz(quiz),
    review: quiz.questions.map((q, i) => ({
      question: q.question,
      options: q.options,
      selected: attempt.answers[i],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      topic: q.topic,
    })),
  }
}

export async function quizHistory(userId) {
  return QuizAttempt.find({ employeeId: userId }).populate('quizId', 'title topic').sort({ completedAt: -1 }).lean()
}
