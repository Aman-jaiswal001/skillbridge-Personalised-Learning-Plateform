import mongoose from 'mongoose'

const snapshotSchema = new mongoose.Schema({
  title: String,
  description: String,
  youtubeUrl: String,
  videoId: String,
  thumbnailUrl: String,
  instructor: String,
  category: String,
  skills: [String],
  subtopics: [String],
  difficulty: String,
  duration: String,
  language: String,
  prerequisites: [String],
  objectives: [String],
}, { _id: false })

const youtubeLearningItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'YouTubeResource', default: null, index: true },
  resource: { type: snapshotSchema, required: true },
  status: { type: String, enum: ['Not Started', 'In Progress', 'Completed'], default: 'Not Started' },
  addedAt: { type: Date, default: Date.now },
  lastAccessedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
}, { timestamps: true })

youtubeLearningItemSchema.index({ userId: 1, resourceId: 1 }, { unique: true, partialFilterExpression: { resourceId: { $type: 'objectId' } } })

export const YouTubeLearningItem = mongoose.model('YouTubeLearningItem', youtubeLearningItemSchema)
