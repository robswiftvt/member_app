const express = require('express');
const { body, validationResult } = require('express-validator');
const Member = require('../models/Member');
const Club = require('../models/Club');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

// Middleware to check validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET all members (with club filtering based on role)
router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = {};

    // Member Admin can only see members in their club
    if (req.user.adminType === 'Member Admin') {
      query.club = req.user.clubId;
    }

    const members = await Member.find(query)
      .populate('club', 'name')
      .select('-__v');

    res.json(members);
  } catch (err) {
    console.error('Fetch members error:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// GET single member by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
      .populate('club', 'name')
      .select('-__v');

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Check authorization: System Admin, Club Admin, or Member Admin of this member's club
    const isAuthorized =
      req.user.adminType === 'System Admin' ||
      req.user.adminType === 'Club Admin' ||
      (req.user.adminType === 'Member Admin' && member.club._id.toString() === req.user.clubId);

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    res.json(member);
  } catch (err) {
    console.error('Fetch member error:', err);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// POST create new member
router.post(
  '/',
  authMiddleware,
  [
    body('firstName').trim().notEmpty().withMessage('First name required'),
    body('lastName').trim().notEmpty().withMessage('Last name required'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email required')
      .normalizeEmail(),
    body('phone').optional().trim(),
    body('address').optional().trim(),
    body('membershipType')
      .optional()
      .isIn(['Full', 'Associate', 'Honorary', 'Inactive'])
      .withMessage('Invalid membership type'),
    body('club').notEmpty().isMongoId().withMessage('Valid club ID required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { firstName, lastName, email, phone, address, membershipType, club } = req.body;

      // Check authorization: System Admin, Club Admin, or Member Admin of this club
      const isAuthorized =
        req.user.adminType === 'System Admin' ||
        req.user.adminType === 'Club Admin' ||
        (req.user.adminType === 'Member Admin' && club === req.user.clubId);

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Check if email already exists
      const existingMember = await Member.findOne({ email });
      if (existingMember) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      // Validate club exists
      const clubExists = await Club.findById(club);
      if (!clubExists) {
        return res.status(400).json({ error: 'Club not found' });
      }

      const member = new Member({
        firstName,
        lastName,
        email,
        phone: phone || '',
        address: address || '',
        membershipType: membershipType || 'Full',
        club,
      });

      await member.save();
      const populatedMember = await member.populate('club', 'name');
      res.status(201).json(populatedMember);
    } catch (err) {
      console.error('Create member error:', err);
      res.status(500).json({ error: 'Failed to create member' });
    }
  }
);

// PUT update member
router.put(
  '/:id',
  authMiddleware,
  [
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Valid email required')
      .normalizeEmail(),
    body('phone').optional().trim(),
    body('address').optional().trim(),
    body('membershipType')
      .optional()
      .isIn(['Full', 'Associate', 'Honorary', 'Inactive'])
      .withMessage('Invalid membership type'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const member = await Member.findById(req.params.id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      // Check authorization: System Admin, Club Admin, or Member Admin of this member's club
      const isAuthorized =
        req.user.adminType === 'System Admin' ||
        req.user.adminType === 'Club Admin' ||
        (req.user.adminType === 'Member Admin' && member.club.toString() === req.user.clubId);

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { firstName, lastName, email, phone, address, membershipType } = req.body;

      // Check if new email already exists (if email is being changed)
      if (email && email !== member.email) {
        const existingMember = await Member.findOne({ email });
        if (existingMember) {
          return res.status(400).json({ error: 'Email already exists' });
        }
        member.email = email;
      }

      if (firstName !== undefined) member.firstName = firstName;
      if (lastName !== undefined) member.lastName = lastName;
      if (phone !== undefined) member.phone = phone;
      if (address !== undefined) member.address = address;
      if (membershipType !== undefined) member.membershipType = membershipType;

      await member.save();
      const populatedMember = await member.populate('club', 'name');
      res.json(populatedMember);
    } catch (err) {
      console.error('Update member error:', err);
      res.status(500).json({ error: 'Failed to update member' });
    }
  }
);

// DELETE member
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Check authorization: System Admin, Club Admin, or Member Admin of this member's club
    const isAuthorized =
      req.user.adminType === 'System Admin' ||
      req.user.adminType === 'Club Admin' ||
      (req.user.adminType === 'Member Admin' && member.club.toString() === req.user.clubId);

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await Member.findByIdAndDelete(req.params.id);
    res.json({ message: 'Member deleted successfully' });
  } catch (err) {
    console.error('Delete member error:', err);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

module.exports = router;
