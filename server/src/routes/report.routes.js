import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import * as report from '../controllers/report.controller.js'

const router = Router()
router.use(protect, requireRole('ADMIN', 'TRAINER'))
router.get('/employee/:id', report.employee)
router.get('/department/:department', report.department)
router.get('/skill-gaps', report.skillGaps)
router.get('/training-effectiveness', report.training)
export default router
