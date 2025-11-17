const express = require('express');
const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');
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

// GET all admins (System Admin only)
router.get('/', authMiddleware, checkRole('System Admin'), async (req, res) => {
  try {
    const admins = await Admin.find()
      .populate('member', 'firstName lastName email club')
      .select('-password');

    res.json(admins);
  } catch (err) {
    console.error('Fetch admins error:', err);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// GET single admin by ID (System Admin only)
router.get('/:id', authMiddleware, checkRole('System Admin'), async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id)
      .populate('member', 'firstName lastName email club')
      .select('-password');

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json(admin);
  } catch (err) {
    console.error('Fetch admin error:', err);
    res.status(500).json({ error: 'Failed to fetch admin' });
  }
});

// POST create new admin (assign role to existing Member)
// System Admin only
router.post(
  '/',
  authMiddleware,
  checkRole('System Admin'),
  [
    body('username').trim().notEmpty().withMessage('Username required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('adminType')
      .isIn(['System Admin', 'Club Admin', 'Member Admin'])
      .withMessage('Invalid admin type'),
    body('member').isMongoId().withMessage('Valid member ID required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username, password, adminType, member } = req.body;

      // Check if username already exists
      const existingAdmin = await Admin.findOne({ username });
      if (existingAdmin) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Check if member exists
      const memberExists = await Member.findById(member);
      if (!memberExists) {
        return res.status(400).json({ error: 'Member not found' });
      }

      // Check if member is already an admin
      const existingMemberAdmin = await Admin.findOne({ member });
      if (existingMemberAdmin) {
        return res.status(400).json({ error: 'Member already has an admin role' });
      }

      const admin = new Admin({
        username,
        password,
        adminType,
        member,
      });

      await admin.save();
      const populatedAdmin = await admin.populate('member', 'firstName lastName email club');
      res.status(201).json({
        ...populatedAdmin.toObject(),
        password: undefined, // Never send password back
      });
    } catch (err) {
      console.error('Create admin error:', err);
      res.status(500).json({ error: 'Failed to create admin' });
    }
  }
);

// PUT update admin (System Admin only)
router.put(
  '/:id',
  authMiddleware,
  checkRole('System Admin'),
  [
    body('adminType')
      .optional()
      .isIn(['System Admin', 'Club Admin', 'Member Admin'])
      .withMessage('Invalid admin type'),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const admin = await Admin.findById(req.params.id);
      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' });
      }

      const { adminType, password } = req.body;

      if (adminType !== undefined) {
        admin.adminType = adminType;
      }

      if (password !== undefined) {
        admin.password = password;
      }

      await admin.save();
      const populatedAdmin = await admin.populate('member', 'firstName lastName email club');
      res.json({
        ...populatedAdmin.toObject(),
        password: undefined,
      });
    } catch (err) {
      console.error('Update admin error:', err);
      res.status(500).json({ error: 'Failed to update admin' });
    }
  }
);

// DELETE admin (System Admin only)
router.delete('/:id', authMiddleware, checkRole('System Admin'), async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({ message: 'Admin deleted successfully' });
  } catch (err) {
    console.error('Delete admin error:', err);
    res.status(500).json({ error: 'Failed to delete admin' });
  }
});

module.exports = router;
