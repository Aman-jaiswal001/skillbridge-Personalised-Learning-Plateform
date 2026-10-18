import { env } from '../../config/env.js'
import { DocumentChunk } from '../../models/DocumentChunk.js'
import { atlasVectorSearch, localVectorSearch } from '../vectorStore/mongo.vectorStore.js'

export async function retrieveSimilarChunks({ queryEmbedding, documentIds, k = 5 }) {
  if (env.vectorDb === 'atlas') {
    try {
      const matches = await atlasVectorSearch(DocumentChunk, {
        queryEmbedding,
        documentIds,
        k,
        indexName: env.mongoVectorIndex,
        path: env.mongoVectorPath,
      })
      if (matches.length) return matches
      console.warn('[retriever] Atlas returned no matches; retrying with local cosine search')
    } catch (err) {
      console.error('[retriever] Atlas vector search failed, using local cosine fallback', err.message)
    }
  }
  return localVectorSearch(DocumentChunk, { queryEmbedding, documentIds, k })
}
