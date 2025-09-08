const express = require('express');
const {
  getRooms,
  getRoomStats,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  allocateRoom,
  deallocateRoom,
  getMyRoom,
  getUnallocatedStudents,
  getAvailableBlocks
} = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/auth');
const { checkActiveUser } = require('../middleware/checkActiveUser');

const router = express.Router();

router.get('/', protect, getRooms);
router.get('/stats', protect, getRoomStats);
router.get('/my-room', protect, authorize('student'), getMyRoom);
router.get('/unallocated-students', protect, authorize('admin', 'warden'), getUnallocatedStudents);
router.get('/available-blocks', protect, getAvailableBlocks);
router.get('/:id', protect, authorize('admin', 'warden'), getRoom);
router.post('/', protect, checkActiveUser, authorize('admin'), createRoom);
router.put('/:id', protect, checkActiveUser, authorize('admin'), updateRoom);
router.delete('/:id', protect, checkActiveUser, authorize('admin'), deleteRoom);
router.post('/allocate', protect, checkActiveUser, authorize('warden'), allocateRoom);
router.post('/deallocate', protect, checkActiveUser, authorize('warden'), deallocateRoom);

module.exports = router;