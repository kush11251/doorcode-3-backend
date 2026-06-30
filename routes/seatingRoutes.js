const express = require('express');
const {
  createSeating,
  updateSeatingTable,
  updateSeatingTableByEvent,
  getSeatingByEvent,
  getSeatingById,
  deleteSeating
} = require('../controllers/seatingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createSeating);
router.get('/event/:eventId', protect, getSeatingByEvent);
router.get('/:seatingId', protect, getSeatingById);
router.patch('/:seatingId/table/:tableNumber', protect, updateSeatingTable);
router.patch('/event/:eventId/table/:tableNumber', protect, updateSeatingTableByEvent);
router.delete('/:seatingId', protect, deleteSeating);

module.exports = router;
