const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env variables
dotenv.config();

const app = express();

// Import middleware
const requestLogger = require('./middleware/requestLogger');

// Enable CORS from anywhere
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
    return res.sendStatus(204);
  }
  next();
});

// Middleware to parse JSON
app.use(express.json());

// Request logging middleware
app.use(requestLogger);

// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const logRoutes = require('./routes/logRoutes');
const eventRoutes = require('./routes/eventRoutes');
const seatingRoutes = require('./routes/seatingRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const globalRoutes = require('./routes/globalRoutes');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/seating', seatingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/global', globalRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});