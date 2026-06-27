const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const logSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  timestamp: {
    type: String,
    required: true,
    default: () => new Date().toISOString()
  },
  level: {
    type: String,
    enum: ['INFO', 'WARNING', 'ERROR'],
    required: true,
    default: 'INFO'
  },
  message: {
    type: String,
    required: true
  },
  service: {
    type: String,
    required: true
  },
  origin: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  },
  request: {
    type: Object,
    default: {}
  },
  response: {
    type: Object,
    default: {}
  },
  metadata: {
    type: Object,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('Log', logSchema);
