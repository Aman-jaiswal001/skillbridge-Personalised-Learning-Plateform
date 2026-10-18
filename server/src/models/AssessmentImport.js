import mongoose from 'mongoose'

const assessmentImportSchema = new mongoose.Schema({
  requestId: { type: String, required: true },
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
  importedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalFilename: { type: String, required: true, maxlength: 180 },
  summary: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true })

assessmentImportSchema.index({ importedBy: 1, requestId: 1 }, { unique: true, name: 'assessment_import_idempotency' })

export const AssessmentImport = mongoose.model('AssessmentImport', assessmentImportSchema)
