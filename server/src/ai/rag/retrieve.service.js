import { aiConfig } from '../../config/ai.js'
import { embedQuery } from '../embeddings/embedding.provider.js'
import { retrieveSimilarChunks } from '../retrievers/vector.retriever.js'

export async function retrieveContext({ question, documentIds, k = aiConfig.retrieveK }) {
  const queryEmbedding = await embedQuery(question)
  return retrieveSimilarChunks({
    queryEmbedding,
    documentIds,
    k,
  })
}
