const User = require('../models/User');
const logger = require('../logger');

// @desc    Get all users (Admin only example)
// @route   GET /api/users
exports.getAllUsers = async (req, res) => {
  try {
    // Return all users, excluding passwords
    const users = await User.find({}).select('-password');
    await logger({ level: 'INFO', message: `Admin accessed all users`, service: 'user-service' });
    res.status(200).json({ statusCode: 200, count: users.length, data: users });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Get all users failed: ${error.message}`, service: 'user-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};
// @desc    Update user profile
// @route   PATCH /api/users/:userId
exports.updateUserProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber } = req.body;
    const user = await User.findOne({ userId: req.params.userId });

    if (!user) {
      await logger({ level: 'WARNING', message: `Profile update failed, user not found: ${req.params.userId}`, service: 'user-service' });
      return res.status(404).json({ statusCode: 404, message: 'User not found' });
    }

    if (req.user.role !== 'admin' && req.user.userId !== user.userId) {
      await logger({ level: 'WARNING', message: `Unauthorized profile update attempt by ${req.user.userId}`, service: 'user-service' });
      return res.status(403).json({ statusCode: 403, message: 'Forbidden' });
    }

    if (email && email !== user.email) {
      const emailTaken = await User.findOne({ email });
      if (emailTaken) {
        await logger({ level: 'WARNING', message: `Profile update failed, email already in use: ${email}`, service: 'user-service' });
        return res.status(400).json({ statusCode: 400, message: 'Email already in use' });
      }
    }

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) user.email = email;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

    await user.save();

    await logger({ level: 'INFO', message: `Updated profile for ${user.userId}`, service: 'user-service' });
    res.status(200).json({
      statusCode: 200,
      message: 'User profile updated successfully',
      data: {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role
      }
    });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Update profile failed: ${error.message}`, service: 'user-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

// @desc    Change password using old password
// @route   POST /api/users/:userId/password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ statusCode: 400, message: 'oldPassword and newPassword are required' });
    }

    const user = await User.findOne({ userId: req.params.userId });
    if (!user) {
      await logger({ level: 'WARNING', message: `Password change failed, user not found: ${req.params.userId}`, service: 'user-service' });
      return res.status(404).json({ statusCode: 404, message: 'User not found' });
    }

    if (req.user.role !== 'admin' && req.user.userId !== user.userId) {
      await logger({ level: 'WARNING', message: `Unauthorized password change attempt by ${req.user.userId}`, service: 'user-service' });
      return res.status(403).json({ statusCode: 403, message: 'Forbidden' });
    }

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      await logger({ level: 'WARNING', message: `Invalid old password for ${req.params.userId}`, service: 'user-service' });
      return res.status(401).json({ statusCode: 401, message: 'Old password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    await logger({ level: 'INFO', message: `Password changed for ${user.userId}`, service: 'user-service' });
    res.status(200).json({ statusCode: 200, message: 'Password updated successfully' });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Change password failed: ${error.message}`, service: 'user-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};
// @desc    Get a single user by UUID
// @route   GET /api/users/:userId
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId }).select('-password');
    
    if (!user) {
      await logger({ level: 'WARNING', message: `User lookup failed for ${req.params.userId}`, service: 'user-service' });
      return res.status(404).json({ statusCode: 404, message: 'User not found' });
    }

    await logger({ level: 'INFO', message: `Viewed user details for ${req.params.userId}`, service: 'user-service' });
    res.status(200).json({ statusCode: 200, data: user });
  } catch (error) {
    await logger({ level: 'ERROR', message: `ERROR: ${error.message}`, service: 'user-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};