import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import * as admin from '../controllers/admin.controller.js'
import * as assessment from '../controllers/assessment.controller.js'
import * as assessmentImport from '../controllers/assessmentImport.controller.js'
import { uploadAssessmentSpreadsheet } from '../middleware/assessmentImportUpload.middleware.js'

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
router.get('/assessments', assessment.adminList)
router.post('/assessments', assessment.adminCreate)
router.put('/assessments/:id', assessment.adminUpdate)
router.patch('/assessments/:id/publish', assessment.adminPublish)
router.delete('/assessments/:id', assessment.adminArchive)
router.get('/assessments/import/template', assessmentImport.template)
router.post('/assessments/import/preview', uploadAssessmentSpreadsheet, assessmentImport.preview)
router.post('/assessments/import', uploadAssessmentSpreadsheet, assessmentImport.importQuestions)
router.get('/courses', admin.courses)
export default router
