import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import * as notification from '../controllers/notification.controller.js'

const router = Router()
router.use(protect)
router.get('/', notification.list)
router.put('/read-all', notification.readAll)
router.put('/:id/read', notification.readOne)
export default router
