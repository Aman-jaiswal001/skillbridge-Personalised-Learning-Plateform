import mongoose from 'mongoose'

const chatSessionSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    title: { type: String, default: 'Learning chat' },
  },
  { timestamps: true },
)

export const ChatSession = mongoose.model('ChatSession', chatSessionSchema)
