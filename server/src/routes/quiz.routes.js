import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { aiLimiter } from '../middleware/rateLimit.middleware.js'
import * as quiz from '../controllers/quiz.controller.js'

const router = Router()
router.use(protect)
router.post('/generate', aiLimiter, quiz.generate)
router.post('/youtube-learning/:itemId', aiLimiter, quiz.generateYouTube)
router.get('/performance', quiz.performance)
router.get('/history', quiz.history)
router.get('/', quiz.list)
router.get('/:id', quiz.getOne)
router.post('/:id/submit', quiz.submit)
router.get('/:id/result', quiz.result)
export default router
