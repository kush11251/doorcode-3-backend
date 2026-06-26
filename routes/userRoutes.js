const express = require('express');
const { getAllUsers, getUserById } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

// Get all users (Protected, only 'admin' can view all users)
router.get('/', protect, authorize('admin'), getAllUsers);

// Get single user by UUID (Protected, accessible by admin, organizer, and user)
router.get('/:userId', protect, getUserById);

module.exports = router;