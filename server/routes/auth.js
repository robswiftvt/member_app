const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find admin by username
    const admin = await Admin.findOne({ username }).populate('member');
    if (!admin) {
      return res.status(401).json({ error: 'The Username and/or Password was not correct.' });
    }

    // Verify password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'The Username and/or Password was not correct.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        adminId: admin._id,
        username: admin.username,
        adminType: admin.adminType,
        memberId: admin.member._id,
        clubId: admin.member.club,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Determine redirect path based on admin type
    let redirectPath = '/home';
    if (admin.adminType === 'Member Admin') {
      redirectPath = '/club-overview';
    }

    res.json({
      token,
      adminType: admin.adminType,
      redirectPath,
      admin: {
        id: admin._id,
        username: admin.username,
        adminType: admin.adminType,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout endpoint (optional - mainly for client-side token cleanup)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
