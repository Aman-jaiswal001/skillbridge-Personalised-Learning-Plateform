import mongoose from 'mongoose'

const quizQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: [{ type: String }],
    correctAnswer: { type: Number, required: true },
    explanation: { type: String, default: '' },
    topic: { type: String, default: '' },
    tags: [{ type: String }],
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
    source: {
      documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
      fileName: String,
      pageNumber: Number,
    },
  },
  { _id: true },
)

const quizSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    title: { type: String, required: true },
    topic: { type: String, default: '' },
    youtubeResourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'YouTubeResource', default: null, index: true },
    youtubeLearningItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'YouTubeLearningItem', default: null, index: true },
    contentSource: { type: String, enum: ['document', 'metadata', 'transcript', 'topic'], default: 'topic' },
    sourceLabel: { type: String, default: '' },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    questionType: { type: String, enum: ['MCQ', 'True/False'], default: 'MCQ' },
    questions: [quizQuestionSchema],
    totalQuestions: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'ready', 'archived'], default: 'ready' },
  },
  { timestamps: true },
)

quizSchema.index({ youtubeLearningItemId: 1 }, { unique: true, partialFilterExpression: { youtubeLearningItemId: { $type: 'objectId' } } })

export const Quiz = mongoose.model('Quiz', quizSchema)
