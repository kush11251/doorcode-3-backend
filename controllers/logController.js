const Log = require('../models/Log');

// @desc    View last 50 logs
// @route   GET /api/logs
// @access  Admin only
exports.getLogs = async (req, res) => {
  try {
    const logs = await Log.find({}).sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    View a single log by id
// @route   GET /api/logs/:id
// @access  Admin only
exports.getLogById = async (req, res) => {
  try {
    const log = await Log.findOne({ id: req.params.id });
    if (!log) {
      return res.status(404).json({ message: 'Log not found' });
    }
    res.status(200).json({ data: log });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Clear all logs
// @route   DELETE /api/logs
// @access  Admin only
exports.clearLogs = async (req, res) => {
  try {
    await Log.deleteMany({});
    res.status(200).json({ message: 'All logs cleared' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a log entry
// @param   {string} level
// @param   {string} message
// @param   {string} service
exports.createLog = async ({ level, message, service }) => {
  return await Log.create({ level, message, service });
};
