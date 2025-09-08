const express = require('express');
const { getUsers, getUser, createUser, updateUser, deleteUser, getStudents, getStudentStats, bulkStudentOperations, getWardens, getWardenStats, createWarden, updateWarden, deleteWarden, toggleWardenStatus } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, authorize('admin', 'warden', 'student'), getUsers);
router.get('/students', protect, authorize('admin'), getStudents);
router.get('/students/stats', protect, authorize('admin'), getStudentStats);
router.post('/students/bulk', protect, authorize('admin'), bulkStudentOperations);
router.get('/wardens', protect, authorize('admin'), getWardens);
router.get('/wardens/stats', protect, authorize('admin'), getWardenStats);
router.post('/wardens', protect, authorize('admin'), createWarden);
router.put('/wardens/:id', protect, authorize('admin'), updateWarden);
router.delete('/wardens/:id', protect, authorize('admin'), deleteWarden);
router.patch('/wardens/:id/toggle-status', protect, authorize('admin'), toggleWardenStatus);
router.get('/:id', protect, authorize('admin'), getUser);
router.post('/', protect, authorize('admin'), createUser);
router.put('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;