const express = require('express');
const { getDashboardStats, getChartData, getWardenStats } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', protect, getDashboardStats);
router.get('/charts', protect, getChartData);
router.get('/warden-stats', protect, getWardenStats);

module.exports = router;