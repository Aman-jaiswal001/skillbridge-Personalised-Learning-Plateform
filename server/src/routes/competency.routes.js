import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import * as competency from '../controllers/competency.controller.js'

const router = Router()
router.use(protect)
router.get('/', competency.list)
export default router
