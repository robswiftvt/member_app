require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const mongoose = require('mongoose');
const authMiddleware = require('./middleware/authMiddleware');
const authRoutes = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Auth routes (no auth required)
app.use('/api/auth', authRoutes);

// Protected routes
const clubRoutes = require('./routes/clubs');
const memberRoutes = require('./routes/members');
const adminRoutes = require('./routes/admins');
const paymentRoutes = require('./routes/payments');
const memberPaymentRoutes = require('./routes/memberPayments');
const configRoutes = require('./routes/config');
const uploadRoutes = require('./routes/uploads');
app.use('/api/clubs', clubRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/member-payments', memberPaymentRoutes);
app.use('/api/config', configRoutes);
app.use('/api/uploads', uploadRoutes);

// Status route to report server + MongoDB connection state
app.get('/api/status', (req, res) => {
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const state = mongoose.connection.readyState;
  res.json({
    server: 'ok',
    uptime: process.uptime(),
    mongo: { state, stateText: states[state] || 'unknown' }
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from server' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
