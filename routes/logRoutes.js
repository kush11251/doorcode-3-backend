const express = require('express');
const { getLogs, getLogById, clearLogs } = require('../controllers/logController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/', getLogs);
router.get('/:id', getLogById);
router.delete('/', clearLogs);

module.exports = router;
