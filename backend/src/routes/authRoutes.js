const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passport = require('passport');

// Signup
router.post('/signup', authController.signup);
// Login
router.post('/login', authController.login);
// Forgot Password
router.post('/forgot-password', authController.forgotPassword);
// Reset Password
router.post('/reset-password', authController.resetPassword);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
  // Successful authentication, redirect or respond with token
  res.redirect('/');
});

module.exports = router; 