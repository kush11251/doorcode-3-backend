const mongoose = require('mongoose');

const globalControlSchema = new mongoose.Schema({
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  signupEnabled: {
    type: Boolean,
    default: true
  },
  metadata: {
    updatedBy: { type: String, default: '' }
  }
}, { timestamps: true });

module.exports = mongoose.model('GlobalControl', globalControlSchema);
