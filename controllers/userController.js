const User = require('../models/User');
const logger = require('../logger');

// @desc    Get all users (Admin only example)
// @route   GET /api/users
exports.getAllUsers = async (req, res) => {
  try {
    // Return all users, excluding passwords
    const users = await User.find({}).select('-password');
    await logger({ level: 'INFO', message: `Admin accessed all users`, service: 'user-service' });
    res.status(200).json({ count: users.length, data: users });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Get all users failed: ${error.message}`, service: 'user-service' });
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single user by UUID
// @route   GET /api/users/:userId
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId }).select('-password');
    
    if (!user) {
      await logger({ level: 'WARNING', message: `User lookup failed for ${req.params.userId}`, service: 'user-service' });
      return res.status(404).json({ message: 'User not found' });
    }

    await logger({ level: 'INFO', message: `Viewed user details for ${req.params.userId}`, service: 'user-service' });
    res.status(200).json({ data: user });
  } catch (error) {
    await logger({ level: 'ERROR', message: `ERROR: ${error.message}`, service: 'user-service' });
    res.status(500).json({ message: error.message });
  }
};