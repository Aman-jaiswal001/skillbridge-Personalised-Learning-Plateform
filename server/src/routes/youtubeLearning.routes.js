import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import * as controller from '../controllers/youtubeLearning.controller.js'

const router = Router()
router.use(protect)
router.get('/resources', controller.listResources)
router.post('/resources', requireRole('ADMIN'), controller.createResource)
router.put('/resources/:id', requireRole('ADMIN'), controller.updateResource)
router.delete('/resources/:id', requireRole('ADMIN'), controller.deleteResource)
router.get('/items', controller.myItems)
router.post('/items/:resourceId', controller.addItem)
router.get('/items/:itemId', controller.getItem)
router.patch('/items/:itemId', controller.completeItem)
router.delete('/items/:itemId', controller.removeItem)
export default router
