import { Router } from 'express'
import { authLimiter } from '../middleware/rateLimit.middleware.js'
import { protect } from '../middleware/auth.middleware.js'
import * as auth from '../controllers/auth.controller.js'

const router = Router()
router.post('/register', authLimiter, ...auth.register)
router.post('/login', authLimiter, ...auth.login)
router.post('/logout', protect, auth.logout)
router.get('/me', protect, auth.me)
router.post('/forgot-password', authLimiter, auth.forgotPassword)
router.post('/reset-password', authLimiter, auth.resetPassword)
export default router
