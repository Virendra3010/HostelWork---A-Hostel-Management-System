const express = require('express');
const {
  getSettings,
  updateSettings,
  getSystemStats,
  resetSettings,
  backupData
} = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getSettings);
router.put('/', protect, updateSettings);
router.get('/stats', protect, getSystemStats);
router.post('/reset', protect, resetSettings);
router.get('/backup', protect, backupData);

module.exports = router;