import { env } from './env.js'

export const aiConfig = {
  llmProvider: env.llmProvider,
  embeddingProvider: env.embeddingProvider,
  vectorDb: env.vectorDb,
  chunkSize: 800,
  chunkOverlap: 120,
  retrieveK: 5,
  quizMaxQuestions: 20,
}

export function hasLiveLlm() {
  if (env.llmProvider === 'openai') return Boolean(env.openaiApiKey)
  if (env.llmProvider === 'gemini' || env.llmProvider === 'google') return Boolean(env.googleApiKey)
  return false
}

export function hasLiveEmbeddings() {
  if (env.embeddingProvider === 'openai') return Boolean(env.openaiApiKey)
  if (env.embeddingProvider === 'gemini' || env.embeddingProvider === 'google') return Boolean(env.googleApiKey)
  if (env.embeddingProvider === 'huggingface') return Boolean(env.huggingFaceApiKey)
  return false
}
