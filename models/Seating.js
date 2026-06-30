const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const seatingPersonSchema = new mongoose.Schema({
  userId: { type: String, default: '' },
  role: {
    type: String,
    enum: ['guest', 'vip', 'none'],
    default: 'none'
  },
  seat: { type: String, required: true }
}, { _id: false });

const seatingTableSchema = new mongoose.Schema({
  tableNumber: { type: String, required: true },
  numberOfPeople: { type: Number, default: 0 },
  people: { type: [seatingPersonSchema], default: [] }
}, { _id: false });

const seatingSchema = new mongoose.Schema({
  seatingId: {
    type: String,
    default: uuidv4,
    unique: true
  },
  eventId: {
    type: String,
    required: true,
    unique: true
  },
  tables: { type: [seatingTableSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Seating', seatingSchema);
