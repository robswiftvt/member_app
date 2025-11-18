const express = require('express');
const jwt = require('jsonwebtoken');
const Member = require('../models/Member');

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find member by email
    const member = await Member.findOne({ email: email.toLowerCase() });
    if (!member) {
      return res.status(401).json({ error: 'The Email and/or Password was not correct.' });
    }

    // Check if member is an admin
    if (!member.adminType || !member.password) {
      return res.status(401).json({ error: 'The Email and/or Password was not correct.' });
    }

    // Verify password
    const isMatch = await member.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'The Email and/or Password was not correct.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        memberId: member._id,
        email: member.email,
        adminType: member.adminType,
        clubId: member.club,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Determine redirect path based on admin type
    let redirectPath = '/home';
    if (member.adminType === 'Member Admin') {
      redirectPath = '/club-overview';
    }

    res.json({
      token,
      adminType: member.adminType,
      redirectPath,
      admin: {
        id: member._id,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        adminType: member.adminType,
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
