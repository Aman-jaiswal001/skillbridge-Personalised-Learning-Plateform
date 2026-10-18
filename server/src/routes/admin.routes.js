import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import * as admin from '../controllers/admin.controller.js'

const router = Router()
router.use(protect, requireRole('ADMIN'))
router.get('/dashboard', admin.dashboard)
router.get('/employees', admin.listEmployees)
router.post('/employees', admin.createEmployee)
router.get('/employees/:id', admin.getEmployee)
router.put('/employees/:id', admin.updateEmployee)
router.delete('/employees/:id', admin.deleteEmployee)
router.post('/employees/:id/refresh', admin.refreshEmployeeIntel)
router.post('/notifications', admin.broadcast)
router.get('/assessments', admin.assessments)
router.get('/courses', admin.courses)
export default router
