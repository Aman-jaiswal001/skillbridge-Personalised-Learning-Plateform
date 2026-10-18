import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['course', 'assessment', 'certificate', 'material', 'system', 'recommendation'],
      default: 'system',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

notificationSchema.index({ userId: 1, createdAt: -1 })

export const Notification = mongoose.model('Notification', notificationSchema)
