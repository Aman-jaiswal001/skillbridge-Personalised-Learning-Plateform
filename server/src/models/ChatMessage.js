import mongoose from 'mongoose'

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    sources: [
      {
        documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
        fileName: String,
        pageNumber: Number,
        chunkId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentChunk' },
      },
    ],
  },
  { timestamps: true },
)

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema)
