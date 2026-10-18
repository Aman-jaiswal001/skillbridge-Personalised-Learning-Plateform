import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

function requiredInProd(name) {
  const value = process.env[name]
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value || ''
}

function positiveInteger(name, fallback) {
  const value = Number(process.env[name])
  return Number.isSafeInteger(value) && value > 0 ? value : fallback
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/skillbridge-ai',
  jwtSecret: process.env.JWT_SECRET || 'skillbridge-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  llmProvider: (process.env.LLM_PROVIDER || 'fallback').toLowerCase(),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  googleApiKey: process.env.GOOGLE_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  embeddingProvider: (process.env.EMBEDDING_PROVIDER || 'fallback').toLowerCase(),
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  huggingFaceApiKey: process.env.HUGGINGFACE_API_KEY || '',
  vectorDb: (process.env.VECTOR_DB || 'local').toLowerCase(),
  mongoVectorIndex: process.env.MONGODB_VECTOR_INDEX || 'document_chunks_vector',
  mongoVectorPath: process.env.MONGODB_VECTOR_PATH || 'embedding',
  igotAdapter: (process.env.IGOT_ADAPTER || 'mock').toLowerCase(),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  maxFileSize: Number(process.env.MAX_FILE_SIZE) || 20 * 1024 * 1024,
  assessmentImportMaxFileSize: positiveInteger('ASSESSMENT_IMPORT_MAX_FILE_SIZE', 5 * 1024 * 1024),
  assessmentImportMaxRows: positiveInteger('ASSESSMENT_IMPORT_MAX_ROWS', 1000),
  quizReviewThreshold: Number(process.env.QUIZ_REVIEW_THRESHOLD) || 50,
  quizAdvanceThreshold: Number(process.env.QUIZ_ADVANCE_THRESHOLD) || 80,
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  logLevel: process.env.LOG_LEVEL || 'info',
}

requiredInProd('JWT_SECRET')
requiredInProd('MONGO_URI')
