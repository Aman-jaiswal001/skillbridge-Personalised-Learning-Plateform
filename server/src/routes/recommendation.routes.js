import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import * as recommendation from '../controllers/recommendation.controller.js'

const router = Router()
router.use(protect)
router.get('/', recommendation.listMine)
router.post('/refresh', recommendation.refresh)
export default router
