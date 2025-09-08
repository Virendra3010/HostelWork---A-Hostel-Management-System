const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe, updateProfile, checkAdmin, forgotPassword, resetPassword, testEmail } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').notEmpty().withMessage('Phone number is required')
];

router.post('/register', registerValidation, register);
router.post('/login', login);
router.get('/check-admin', checkAdmin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/test-email', testEmail);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;