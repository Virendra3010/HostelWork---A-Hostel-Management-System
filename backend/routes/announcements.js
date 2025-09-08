const express = require('express');
const {
  getAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementStats
} = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/auth');
const { checkActiveUser } = require('../middleware/checkActiveUser');

const router = express.Router();

router.get('/', protect, getAnnouncements);
router.get('/stats', protect, getAnnouncementStats);
router.get('/all', protect, authorize('admin', 'warden'), getAllAnnouncements);
router.post('/', protect, checkActiveUser, authorize('admin', 'warden'), createAnnouncement);
router.put('/:id', protect, checkActiveUser, authorize('admin', 'warden'), updateAnnouncement);
router.delete('/:id', protect, checkActiveUser, authorize('admin', 'warden'), deleteAnnouncement);

module.exports = router;