const express = require('express');
const { getAllUsers, getUsersSummary, getUserById, updateUserProfile, changePassword } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

// Get all users (Protected, only 'admin' can view all users)
router.get('/', protect, authorize('admin'), getAllUsers);

// Get simple user list for mapping userIds to names
router.get('/summary', protect, getUsersSummary);

// Get single user by UUID (Protected, accessible by admin, organizer, and user)
router.get('/:userId', protect, getUserById);

// Update user profile (Protected, admin or owner)
router.patch('/:userId', protect, updateUserProfile);

// Change password using old password (Protected, admin or owner)
router.post('/:userId/password', protect, changePassword);

module.exports = router;