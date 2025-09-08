const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, changePassword } = require('../controllers/profileController');
const { protect } = require('../middleware/auth');

// @route   GET /api/profile
// @desc    Get current user profile
// @access  Private
router.get('/', protect, getProfile);

// @route   PUT /api/profile
// @desc    Update user profile
// @access  Private
router.put('/', protect, updateProfile);

// @route   PUT /api/profile/password
// @desc    Change user password
// @access  Private
router.put('/password', protect, changePassword);

module.exports = router;