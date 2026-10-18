import mongoose from 'mongoose'

const assessmentResultSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true, immutable: true },
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true, index: true },
    assessmentLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
    passingScore: { type: Number, min: 0, max: 100, default: 70 },
    passed: { type: Boolean, default: false },
    status: { type: String, enum: ['IN_PROGRESS', 'COMPLETED'], default: 'IN_PROGRESS', index: true },
    answers: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
        selected: { type: Number, default: null },
      },
    ],
    score: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },
    percentage: { type: Number, required: true, default: 0 },
    correct: { type: Number, required: true, default: 0 },
    incorrect: { type: Number, required: true, default: 0 },
    unattempted: { type: Number, required: true, default: 0 },
    skillPerformance: [
      {
        skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
        name: String,
        value: Number,
        correct: Number,
        total: Number,
        level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'] },
        passed: { type: Boolean, default: false },
        passingScore: Number,
      },
    ],
    weakSkills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
    feedback: { type: String, default: '' },
    completedAt: { type: Date },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
  },
  { timestamps: true },
)

assessmentResultSchema.index({ employeeId: 1, assessmentId: 1, completedAt: -1 })
assessmentResultSchema.index({ employeeId: 1, completedAt: -1 })
assessmentResultSchema.index({ employeeId: 1, assessmentId: 1, status: 1 })

export const AssessmentResult = mongoose.model('AssessmentResult', assessmentResultSchema)
