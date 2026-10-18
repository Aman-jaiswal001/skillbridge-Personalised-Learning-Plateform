import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import * as learningPath from '../controllers/learningPath.controller.js'

const router = Router()
router.use(protect)
router.get('/', learningPath.getMine)
router.post('/refresh', learningPath.refresh)
export default router
