import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import { apiLimiter } from './middleware/rateLimit.middleware.js'
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware.js'
import authRoutes from './routes/auth.routes.js'
import employeeRoutes from './routes/employee.routes.js'
import skillRoutes from './routes/skill.routes.js'
import competencyRoutes from './routes/competency.routes.js'
import assessmentRoutes from './routes/assessment.routes.js'
import courseRoutes from './routes/course.routes.js'
import recommendationRoutes from './routes/recommendation.routes.js'
import learningPathRoutes from './routes/learningPath.routes.js'
import assistantRoutes from './routes/assistant.routes.js'
import documentRoutes from './routes/document.routes.js'
import quizRoutes from './routes/quiz.routes.js'
import analyticsRoutes from './routes/analytics.routes.js'
import notificationRoutes from './routes/notification.routes.js'
import adminRoutes from './routes/admin.routes.js'
import reportRoutes from './routes/report.routes.js'

export function createApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))
  app.use('/api', apiLimiter)

  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      message: 'SkillBridge AI API is running',
      data: { env: env.nodeEnv, llm: env.llmProvider, embeddings: env.embeddingProvider },
    })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/employees', employeeRoutes)
  app.use('/api/skills', skillRoutes)
  app.use('/api/competencies', competencyRoutes)
  app.use('/api/assessments', assessmentRoutes)
  app.use('/api/courses', courseRoutes)
  app.use('/api/recommendations', recommendationRoutes)
  app.use('/api/learning-path', learningPathRoutes)
  app.use('/api/assistant', assistantRoutes)
  app.use('/api/documents', documentRoutes)
  app.use('/api/quiz', quizRoutes)
  app.use('/api/analytics', analyticsRoutes)
  app.use('/api/notifications', notificationRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api/reports', reportRoutes)

  app.use(notFoundMiddleware)
  app.use(errorMiddleware)
  return app
}
