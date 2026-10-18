import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import * as assessment from '../controllers/assessment.controller.js'

const router = Router()
router.use(protect)
router.get('/', assessment.list)
router.get('/history', assessment.history)
router.post('/:id/start', assessment.start)
router.get('/attempts/:attemptId', assessment.attempt)
router.put('/attempts/:attemptId/answers', assessment.saveAnswers)
router.post('/attempts/:attemptId/submit', assessment.submitAttempt)
router.get('/results/:resultId', assessment.result)
router.get('/:id', assessment.getOne)
export default router
