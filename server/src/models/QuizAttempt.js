import mongoose from 'mongoose'

const quizAttemptSchema = new mongoose.Schema(
  {
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    answers: [{ type: Number, default: null }],
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    percentage: { type: Number, required: true },
    correct: { type: Number, required: true },
    incorrect: { type: Number, required: true },
    unattempted: { type: Number, required: true },
    weakTopics: [{ type: String }],
    questionPerformance: [{ q: String, score: Number }],
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

quizAttemptSchema.index({ quizId: 1, employeeId: 1, completedAt: -1 })

export const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema)
