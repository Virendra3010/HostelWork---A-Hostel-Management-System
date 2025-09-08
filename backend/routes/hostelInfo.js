const express = require('express');
const { getHostelInfo, updateHostelInfo } = require('../controllers/hostelInfoController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Get hostel information (accessible to all authenticated users)
router.get('/', protect, getHostelInfo);

// Update hostel information (admin only)
router.put('/', protect, updateHostelInfo);

module.exports = router;