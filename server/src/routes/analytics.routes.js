import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import * as analytics from '../controllers/analytics.controller.js'

const router = Router()
router.use(protect)
router.get('/employee', analytics.employee)
router.get('/admin', requireRole('ADMIN', 'TRAINER'), analytics.admin)
export default router
