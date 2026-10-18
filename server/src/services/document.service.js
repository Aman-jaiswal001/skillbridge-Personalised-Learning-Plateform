import fs from 'node:fs/promises'
import { Document } from '../models/Document.js'
import { DocumentChunk } from '../models/DocumentChunk.js'
import { ChatSession } from '../models/ChatSession.js'
import { ApiError } from '../utils/ApiError.js'
import { ingestDocument } from '../ai/rag/ingest.service.js'

export async function createAndIngest({ file, userId }) {
  if (!file) throw ApiError.badRequest('File is required')
  const doc = await Document.create({
    uploadedBy: userId,
    fileName: file.filename,
    originalName: file.originalname,
    fileType: file.mimetype,
    fileSize: file.size,
    path: file.path,
    status: 'pending',
  })
  ingestDocument(doc._id).catch((err) => {
    console.error('[document] ingest error', err.message)
  })
  return doc
}

export async function listDocuments(userId) {
  return Document.find({ uploadedBy: userId }).sort({ createdAt: -1 }).select('-path').lean()
}

export async function deleteDocument(userId, _role, id) {
  if (!/^[a-f\d]{24}$/i.test(String(id))) throw ApiError.badRequest('Invalid document ID')
  const doc = await Document.findOne({ _id: id, uploadedBy: userId })
  if (!doc) throw ApiError.notFound('Document not found')
  await ChatSession.updateMany({ documentIds: doc._id, employeeId: userId }, { $pull: { documentIds: doc._id } })
  await DocumentChunk.deleteMany({ documentId: doc._id })
  try {
    await fs.unlink(doc.path)
  } catch {
    /* file may already be gone */
  }
  await doc.deleteOne()
  return { deleted: true }
}

export async function waitUntilReady(id, timeoutMs = 20000) {
  if (!/^[a-f\d]{24}$/i.test(String(id))) throw ApiError.badRequest('Invalid document ID')
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const doc = await Document.findById(id)
    if (!doc) throw ApiError.notFound('Document not found')
    if (doc.status === 'ready') return doc
    if (doc.status === 'failed') throw ApiError.ai('Document processing failed')
    await new Promise((r) => setTimeout(r, 400))
  }
  return Document.findById(id)
}
