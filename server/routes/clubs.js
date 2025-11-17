const express = require('express');
const { body, validationResult } = require('express-validator');
const Club = require('../models/Club');
const Member = require('../models/Member');
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

// GET all clubs (accessible by System Admin, Club Admin)
router.get('/', authMiddleware, checkRole('System Admin', 'Club Admin'), async (req, res) => {
  try {
    const clubs = await Club.find().populate('memberAdmin', 'firstName lastName email');
    res.json(clubs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clubs' });
  }
});

// GET single club by ID
router.get(
  '/:id',
  authMiddleware,
  async (req, res) => {
    try {
      const club = await Club.findById(req.params.id).populate('memberAdmin', 'firstName lastName email');
      if (!club) {
        return res.status(404).json({ error: 'Club not found' });
      }

      // Check authorization: System Admin, Club Admin, or Member Admin of this club
      const isAuthorized =
        req.user.adminType === 'System Admin' ||
        req.user.adminType === 'Club Admin' ||
        (req.user.adminType === 'Member Admin' && club._id.toString() === req.user.clubId);

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      res.json(club);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch club' });
    }
  }
);

// POST create new club (accessible by System Admin, Club Admin)
router.post(
  '/',
  authMiddleware,
  checkRole('System Admin', 'Club Admin'),
  [
    body('name').trim().notEmpty().withMessage('Club name required'),
    body('location').optional().trim(),
    body('homePage').optional({ checkFalsy: true }).trim().isURL().withMessage('Invalid URL'),
    body('status').optional().isIn(['Active', 'Inactive']).withMessage('Invalid status'),
    body('memberAdmin').optional().isMongoId().withMessage('Invalid member ID'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, location, homePage, status, memberAdmin } = req.body;

      // Check if club name already exists
      const existingClub = await Club.findOne({ name });
      if (existingClub) {
        return res.status(400).json({ error: 'Club name already exists' });
      }

      // Validate memberAdmin if provided
      if (memberAdmin) {
        const member = await Member.findById(memberAdmin);
        if (!member) {
          return res.status(400).json({ error: 'Member not found' });
        }
      }

      const club = new Club({
        name,
        location: location || '',
        homePage: homePage || '',
        status: status || 'Active',
        memberAdmin: memberAdmin || null,
      });

      await club.save();
      const populatedClub = await club.populate('memberAdmin', 'firstName lastName email');
      res.status(201).json(populatedClub);
    } catch (err) {
      console.error('Create club error:', err);
      res.status(500).json({ error: 'Failed to create club' });
    }
  }
);

// PUT update club (accessible by System Admin, Club Admin, Member Admin of this club)
router.put(
  '/:id',
  authMiddleware,
  [
    body('name').optional().trim().notEmpty().withMessage('Club name cannot be empty'),
    body('location').optional().trim(),
    body('homePage').optional({ checkFalsy: true }).trim().isURL().withMessage('Invalid URL'),
    body('status').optional().isIn(['Active', 'Inactive']).withMessage('Invalid status'),
    body('memberAdmin').optional().isMongoId().withMessage('Invalid member ID'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const club = await Club.findById(req.params.id);
      if (!club) {
        return res.status(404).json({ error: 'Club not found' });
      }

      // Check authorization
      const isAuthorized =
        req.user.adminType === 'System Admin' ||
        req.user.adminType === 'Club Admin' ||
        (req.user.adminType === 'Member Admin' && club._id.toString() === req.user.clubId);

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { name, location, homePage, status, memberAdmin } = req.body;

      // Check if new name already exists (if name is being changed)
      if (name && name !== club.name) {
        const existingClub = await Club.findOne({ name });
        if (existingClub) {
          return res.status(400).json({ error: 'Club name already exists' });
        }
        club.name = name;
      }

      if (location !== undefined) club.location = location;
      if (homePage !== undefined) club.homePage = homePage;
      if (status !== undefined) club.status = status;

      // Validate memberAdmin if provided
      if (memberAdmin !== undefined) {
        if (memberAdmin === null) {
          club.memberAdmin = null;
        } else {
          const member = await Member.findById(memberAdmin);
          if (!member) {
            return res.status(400).json({ error: 'Member not found' });
          }
          club.memberAdmin = memberAdmin;
        }
      }

      await club.save();
      const populatedClub = await club.populate('memberAdmin', 'firstName lastName email');
      res.json(populatedClub);
    } catch (err) {
      console.error('Update club error:', err);
      res.status(500).json({ error: 'Failed to update club' });
    }
  }
);

// DELETE club (accessible by System Admin, Club Admin only)
router.delete('/:id', authMiddleware, checkRole('System Admin', 'Club Admin'), async (req, res) => {
  try {
    const club = await Club.findByIdAndDelete(req.params.id);
    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    // Delete all members associated with this club
    await Member.deleteMany({ club: req.params.id });

    res.json({ message: 'Club deleted successfully' });
  } catch (err) {
    console.error('Delete club error:', err);
    res.status(500).json({ error: 'Failed to delete club' });
  }
});

module.exports = router;
