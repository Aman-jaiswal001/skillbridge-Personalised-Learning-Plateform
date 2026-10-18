import mongoose from 'mongoose'

const documentChunkSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    content: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    pageNumber: { type: Number, default: 1 },
    metadata: {
      fileName: String,
      documentId: mongoose.Schema.Types.ObjectId,
      pageNumber: Number,
      chunkIndex: Number,
    },
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true },
)

documentChunkSchema.index({ documentId: 1, chunkIndex: 1 })

export const DocumentChunk = mongoose.model('DocumentChunk', documentChunkSchema)
