import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { uploadDocument } from '../middleware/upload.middleware.js'
import * as document from '../controllers/document.controller.js'

const router = Router()
router.use(protect)
router.post('/upload', uploadDocument, document.upload)
router.get('/', document.list)
router.delete('/:id', document.remove)
export default router
