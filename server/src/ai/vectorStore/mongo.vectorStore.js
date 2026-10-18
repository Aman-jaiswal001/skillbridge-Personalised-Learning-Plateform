import mongoose from 'mongoose'

export function cosineSimilarity(a = [], b = []) {
  const n = Math.min(a.length, b.length)
  if (!n) return 0
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < n; i += 1) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom ? dot / denom : 0
}

export async function atlasVectorSearch(DocumentChunk, { queryEmbedding, documentIds, k, indexName, path }) {
  const filter = documentIds?.length
    ? {
        documentId: {
          $in: documentIds.map((id) =>
            mongoose.Types.ObjectId.isValid(id)
              ? new mongoose.Types.ObjectId(id)
              : id,
          ),
        },
      }
    : {}
  const pipeline = [
    {
      $vectorSearch: {
        index: indexName,
        path,
        queryVector: queryEmbedding,
        numCandidates: Math.max(50, k * 10),
        limit: k,
        filter,
      },
    },
    {
      $project: {
        content: 1,
        chunkIndex: 1,
        pageNumber: 1,
        metadata: 1,
        documentId: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ]
  return DocumentChunk.aggregate(pipeline)
}

export async function localVectorSearch(DocumentChunk, { queryEmbedding, documentIds, k }) {
  const filter = documentIds?.length ? { documentId: { $in: documentIds } } : {}
  const chunks = await DocumentChunk.find(filter).select('content chunkIndex pageNumber metadata documentId embedding').lean()
  return chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding || []),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}
