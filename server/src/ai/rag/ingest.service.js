import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { aiConfig } from '../../config/ai.js'
import { Document } from '../../models/Document.js'
import { DocumentChunk } from '../../models/DocumentChunk.js'
import { loadDocumentPages } from '../loaders/index.js'
import { embedTexts } from '../embeddings/embedding.provider.js'

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: aiConfig.chunkSize,
  chunkOverlap: aiConfig.chunkOverlap,
})

export async function ingestDocument(documentId) {
  const doc = await Document.findById(documentId)
  if (!doc) throw new Error('Document not found')

  doc.status = 'processing'
  await doc.save()

  try {
    const pages = await loadDocumentPages(doc.path, doc.originalName)
    const records = []
    for (const page of pages) {
      const pieces = await splitter.splitText(page.content || '')
      pieces.forEach((content, i) => {
        if (!content.trim()) return
        records.push({
          content: content.trim(),
          pageNumber: page.pageNumber,
          localIndex: records.length + i,
        })
      })
    }

    const embeddings = await embedTexts(records.map((r) => r.content))
    if (!(await Document.exists({ _id: doc._id }))) return null
    await DocumentChunk.deleteMany({ documentId: doc._id })

    const chunks = records.map((r, i) => ({
      documentId: doc._id,
      content: r.content,
      chunkIndex: i,
      pageNumber: r.pageNumber,
      metadata: {
        documentId: doc._id,
        fileName: doc.originalName,
        pageNumber: r.pageNumber,
        chunkIndex: i,
      },
      embedding: embeddings[i] || [],
    }))

    if (chunks.length) await DocumentChunk.insertMany(chunks)
    if (!(await Document.exists({ _id: doc._id }))) {
      await DocumentChunk.deleteMany({ documentId: doc._id })
      return null
    }

    doc.status = 'ready'
    doc.totalChunks = chunks.length
    doc.processedAt = new Date()
    doc.errorMessage = ''
    await doc.save()
    return doc
  } catch (err) {
    console.error('[ingest] failed', err.message)
    doc.status = 'failed'
    doc.errorMessage = 'Document processing failed'
    await doc.save()
    throw err
  }
}
