const express = require('express');
const {
  generateFees,
  getFees,
  getFeeStats,
  payFee,
  deleteFee,
  getEligibleRooms
} = require('../controllers/feeController');
const { protect, authorize } = require('../middleware/auth');
const { checkActiveUser } = require('../middleware/checkActiveUser');

const router = express.Router();

router.post('/generate', protect, checkActiveUser, authorize('admin'), generateFees);
router.get('/eligible-rooms', protect, checkActiveUser, authorize('admin'), getEligibleRooms);
router.get('/stats', protect, getFeeStats);
router.get('/', protect, getFees);
router.post('/pay', protect, checkActiveUser, authorize('admin', 'warden', 'student'), payFee);
router.delete('/:id', protect, checkActiveUser, authorize('admin'), deleteFee);

module.exports = router;