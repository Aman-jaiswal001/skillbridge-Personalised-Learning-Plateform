import mongoose from 'mongoose'

const quizAttemptSchema = new mongoose.Schema(
  {
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    youtubeLearningItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'YouTubeLearningItem', default: null, index: true },
    submissionKey: { type: String, default: null },
    answers: [{ type: Number, default: null }],
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    percentage: { type: Number, required: true },
    correct: { type: Number, required: true },
    incorrect: { type: Number, required: true },
    unattempted: { type: Number, required: true },
    weakTopics: [{ type: String }],
    topicPerformance: [{ topic: String, correct: Number, total: Number, percentage: Number }],
    recommendation: { type: mongoose.Schema.Types.Mixed, default: null },
    questionPerformance: [{ q: String, score: Number }],
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

quizAttemptSchema.index({ quizId: 1, employeeId: 1, completedAt: -1 })
quizAttemptSchema.index({ employeeId: 1, submissionKey: 1 }, { unique: true, partialFilterExpression: { submissionKey: { $type: 'string' } } })

export const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema)
