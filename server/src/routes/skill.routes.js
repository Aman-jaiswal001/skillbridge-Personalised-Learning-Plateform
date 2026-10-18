import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import * as skill from '../controllers/skill.controller.js'

const router = Router()
router.use(protect)
router.get('/', skill.list)
router.post('/', requireRole('ADMIN', 'TRAINER'), skill.create)
export default router
