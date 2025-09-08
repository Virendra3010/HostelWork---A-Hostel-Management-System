const express = require('express');
const {
  createLeave,
  getLeaves,
  getLeaveStats,
  updateLeave,
  deleteLeave
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/auth');
const { checkActiveUser } = require('../middleware/checkActiveUser');

const router = express.Router();

router.post('/', protect, checkActiveUser, authorize('student'), createLeave);
router.get('/stats', protect, getLeaveStats);
router.get('/', protect, getLeaves);
router.put('/:id', protect, checkActiveUser, authorize('admin', 'warden', 'student'), updateLeave);
router.delete('/:id', protect, checkActiveUser, authorize('admin', 'warden', 'student'), deleteLeave);

module.exports = router;