import { env } from './env.js'

export const aiConfig = {
  llmProvider: env.llmProvider,
  embeddingProvider: env.embeddingProvider,
  vectorDb: env.vectorDb,
  chunkSize: 800,
  chunkOverlap: 120,
  retrieveK: 5,
  quizMaxQuestions: 20,
  quizReviewThreshold: env.quizReviewThreshold,
  quizAdvanceThreshold: env.quizAdvanceThreshold,
}

export function hasLiveLlm() {
  const hasOpenAi = Boolean(env.openaiApiKey?.trim() && env.openaiModel?.trim())
  const hasGemini = Boolean(env.googleApiKey?.trim() && env.geminiModel?.trim())
  const primary = env.llmProvider === 'google' ? 'gemini' : env.llmProvider
  if (primary === 'openai') return hasOpenAi || hasGemini
  if (primary === 'gemini') return hasGemini || hasOpenAi
  return false
}

export function hasLiveEmbeddings() {
  if (env.embeddingProvider === 'openai') return Boolean(env.openaiApiKey)
  if (env.embeddingProvider === 'gemini' || env.embeddingProvider === 'google') return Boolean(env.googleApiKey)
  if (env.embeddingProvider === 'huggingface') return Boolean(env.huggingFaceApiKey)
  return false
}
