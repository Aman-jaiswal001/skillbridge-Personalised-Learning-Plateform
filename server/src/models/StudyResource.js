import mongoose from 'mongoose'

const studyResourceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: '', trim: true, maxlength: 2000 },
  type: { type: String, enum: ['pdf', 'link'], required: true, index: true },
  subject: { type: String, required: true, trim: true, maxlength: 120, index: true },
  course: { type: String, required: true, trim: true, maxlength: 120, index: true },
  year: { type: String, required: true, trim: true, maxlength: 60, index: true },
  semester: { type: String, default: '', trim: true, maxlength: 60 },
  tags: [{ type: String, trim: true, maxlength: 60 }],
  language: { type: String, default: 'English', trim: true, maxlength: 60 },
  url: { type: String, default: '' },
  canonicalUrl: { type: String, default: undefined },
  storageKey: { type: String, default: '' },
  storageProvider: { type: String, enum: ['local', 'cloudinary'], default: 'local' },
  cloudinaryPublicId: { type: String, default: '' },
  cloudinaryResourceType: { type: String, enum: ['raw'], default: undefined },
  cloudinarySecureUrl: { type: String, default: '' },
  fileName: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  source: { type: String, default: '', trim: true, maxlength: 200 },
  isPublished: { type: Boolean, default: false, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

studyResourceSchema.index({ title: 'text', description: 'text', subject: 'text', course: 'text', tags: 'text' }, { name: 'study_resource_text_search', language_override: 'textSearchLanguage' })
studyResourceSchema.index({ canonicalUrl: 1 }, { unique: true, partialFilterExpression: { canonicalUrl: { $type: 'string' } } })

export const StudyResource = mongoose.model('StudyResource', studyResourceSchema)
