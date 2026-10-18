import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import { uploadStudyPdf } from '../middleware/studyResourceUpload.middleware.js'
import * as controller from '../controllers/studyResource.controller.js'

const router = Router()
router.use(protect)
router.get('/', controller.list)
router.get('/:id/file', controller.file)
router.post('/', requireRole('ADMIN'), uploadStudyPdf, controller.create)
router.put('/:id', requireRole('ADMIN'), uploadStudyPdf, controller.update)
router.delete('/:id', requireRole('ADMIN'), controller.remove)
export default router
