import express from 'express'
import { signup, login, forgotPassword, googleAuth, resetPassword } from '../controllers/authController.js'

const router = express.Router()

router.post('/signup', signup)
router.post('/login', login)
router.post('/forgot-password', forgotPassword)
router.post('/google', googleAuth)
router.post('/reset-password', resetPassword)

export default router 