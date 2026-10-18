import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import * as employee from '../controllers/employee.controller.js'

const router = Router()
router.use(protect)
router.get('/me', employee.getMe)
router.put('/me', employee.updateMe)
router.get('/me/skills', employee.mySkills)
router.put('/me/skills', employee.updateMySkills)
router.post('/me/skills', employee.addMySkill)
router.get('/me/skill-gaps', employee.mySkillGaps)
router.get('/me/recommendations', employee.myRecommendations)
router.get('/me/learning-path', employee.myLearningPath)
router.get('/me/progress', employee.myProgress)
router.get('/me/analytics', employee.myAnalytics)
export default router
