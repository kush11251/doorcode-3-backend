const express = require('express');
const { getGlobalControl, updateGlobalControl } = require('../controllers/globalController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, authorize('admin'), getGlobalControl);
router.patch('/', protect, authorize('admin'), updateGlobalControl);

module.exports = router;
