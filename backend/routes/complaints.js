const express = require('express');
const {
  createComplaint,
  getComplaints,
  getComplaintStats,
  updateComplaintStatus,
  deleteComplaint
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');
const { checkActiveUser } = require('../middleware/checkActiveUser');

const router = express.Router();

router.post('/', protect, checkActiveUser, authorize('student'), createComplaint);
router.get('/stats', protect, getComplaintStats);
router.get('/', protect, getComplaints);
router.put('/:id', protect, checkActiveUser, authorize('admin', 'warden', 'student'), updateComplaintStatus);
router.delete('/:id', protect, checkActiveUser, authorize('admin', 'warden', 'student'), deleteComplaint);

module.exports = router;