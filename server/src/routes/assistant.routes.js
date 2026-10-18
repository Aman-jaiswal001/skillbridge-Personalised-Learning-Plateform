import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { aiLimiter } from '../middleware/rateLimit.middleware.js'
import * as assistant from '../controllers/assistant.controller.js'

const router = Router()
router.use(protect)
router.post('/chat', aiLimiter, assistant.chat)
router.get('/sessions', assistant.sessions)
router.delete('/sessions/:sessionId', assistant.removeSession)
router.get('/sessions/:sessionId', assistant.messages)
export default router
