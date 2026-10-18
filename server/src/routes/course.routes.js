import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import * as course from '../controllers/course.controller.js'

const router = Router()
router.use(protect)
router.get('/my-courses', course.myCourses)
router.get('/', course.list)
router.get('/:id', course.getOne)
router.post('/', requireRole('ADMIN', 'TRAINER'), course.create)
router.put('/:id', requireRole('ADMIN', 'TRAINER'), course.update)
router.delete('/:id', requireRole('ADMIN', 'TRAINER'), course.remove)
router.post('/:id/enroll', course.enroll)
router.put('/:id/progress', course.progress)
export default router
