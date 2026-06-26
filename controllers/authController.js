const User = require('../models/User');
const jwt = require('jsonwebtoken');
const logger = require('../logger');

// Generate JWT Helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      await logger({ level: 'WARNING', message: `Signup attempt failed: ${email} already exists`, service: 'auth' });
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      firstName, lastName, email, phoneNumber, password, role
    });

    await logger({ level: 'INFO', message: `New user registered: ${email}`, service: 'auth' });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        userId: user.userId,
        firstName: user.firstName,
        email: user.email,
        role: user.role
      },
      token: generateToken(user._id)
    });
  } catch (error) {
    await logger({ level: 'ERROR', message: `ERROR: ${error.message}`, service: 'auth' });

    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    
    if (user && (await user.matchPassword(password))) {
      await logger({ level: 'INFO', message: `User login successful: ${email}`, service: 'auth' });
      res.json({
        message: 'Login successful',
        user: {
          userId: user.userId,
          firstName: user.firstName,
          email: user.email,
          role: user.role
        },
        token: generateToken(user._id)
      });
    } else {
      await logger({ level: 'WARNING', message: `Failed login attempt for ${email}`, service: 'auth' });
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    await logger({ level: 'ERROR', message: `Login error: ${error.message}`, service: 'auth' });

    res.status(500).json({ message: error.message });
  }
};