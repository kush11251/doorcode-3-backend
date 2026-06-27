const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const activitySchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true
  },
  time: { type: String, default: '' },
  name: { type: String, required: true },
  description: { type: String, default: '' }
});

const eventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    default: uuidv4,
    unique: true
  },
  title: { type: String, required: true },
  eventCode: { type: String, required: true, unique: true },
  organizer: { type: String, required: true },
  organizerIds: [{ type: String }],
  inviteeIds: [{ type: String }],
  date: { type: String, required: true },
  time: { type: String, default: '' },
  startDateTime: { type: String, required: true },
  endDateTime: { type: String, default: '' },
  location: { type: String, required: true },
  address: { type: String, default: '' },
  dressCode: { type: String, default: '' },
  description: { type: String, default: '' },
  activities: [activitySchema],
  metadata: {
    createdBy: { type: String, default: '' },
    updatedBy: { type: String, default: '' }
  }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
