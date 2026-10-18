import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, index: true },
    resource: { type: String, default: '' },
    resourceId: { type: String, default: '' },
    ip: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: false },
)

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)
