const express = require('express');
const { getDashboardMetrics, getOrganizerMetrics } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, authorize('admin'), getDashboardMetrics);
router.get('/organizer/:userId', protect, authorize('organizer', 'admin'), getOrganizerMetrics);

module.exports = router;
