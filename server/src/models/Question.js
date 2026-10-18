import mongoose from 'mongoose'

const questionSchema = new mongoose.Schema(
  {
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', index: true, required: true },
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: Number, required: true, min: 0 },
    marks: { type: Number, default: 1, min: 0 },
    explanation: { type: String, default: '' },
    skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
    category: { type: String, default: '' },
    skill: { type: String, default: '', index: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    importFingerprint: { type: String, default: undefined },
    importRequestId: { type: String, default: undefined },
  },
  { timestamps: true },
)

questionSchema.index({ assessmentId: 1, importFingerprint: 1 }, { unique: true, partialFilterExpression: { importFingerprint: { $type: 'string' } }, name: 'assessment_import_question_dedupe' })

export const Question = mongoose.model('Question', questionSchema)
