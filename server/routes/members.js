const express = require('express');
const { body, validationResult } = require('express-validator');
const Member = require('../models/Member');
const Club = require('../models/Club');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

// Helper to compute Dec 31 ISO date string according to rule:
// before Oct 30 -> Dec 31 of current year; on/after Oct 30 -> Dec 31 of next year
const computeDec31Iso = (refDate = new Date(), cutoffMonth = parseInt(process.env.NEW_MEMBER_CUTOFF_MONTH || '10', 10), cutoffDay = parseInt(process.env.NEW_MEMBER_CUTOFF_DAY || '30', 10)) => {
  const year = refDate.getFullYear();
  const cutoff = new Date(year, cutoffMonth - 1, cutoffDay);
  const decYear = refDate < cutoff ? year : year + 1;
  return `${decYear}-12-31`;
};

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
      .select('-__v -password');

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
      .select('-__v -password');

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Check authorization: System Admin, Club Admin, or Member Admin of this member's club
    const isAuthorized =
      req.user.adminType === 'System Admin' ||
      req.user.adminType === 'Club Admin' ||
      (req.user.adminType === 'Member Admin' && member.club && member.club._id.toString() === req.user.clubId);

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
    body('streetAddress').optional().trim(),
    body('address2').optional().trim(),
    body('city').optional().trim(),
    body('state').optional().trim(),
    body('zip').optional().trim(),
    body('prefix').optional().trim(),
    body('middleName').optional().trim(),
    body('badgeNickname').optional().trim(),
    body('suffix').optional().trim(),
    body('phoneType').optional().isIn(['Home', 'Cell', 'Work']).withMessage('Invalid phone type'),
    body('occupation').optional().trim(),
    body('employer').optional().trim(),
    body('deceased').optional().toBoolean(),
    body('membershipType')
      .optional()
      .isIn(['Full', 'Associate', 'Honorary', 'Inactive'])
      .withMessage('Invalid membership type'),
    body('club').optional().isMongoId().withMessage('Valid club ID'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        streetAddress,
        address2,
        city,
        state,
        zip,
        prefix,
        middleName,
        badgeNickname,
        suffix,
        phoneType,
        occupation,
        employer,
        deceased,
        membershipType,
        club,
      } = req.body;

      // Validate membershipExpiration if provided: must match computed Dec 31 option
      const { membershipExpiration } = req.body;
      const decIso = computeDec31Iso();
      if (membershipExpiration) {
        const provided = String(membershipExpiration).split('T')[0];
        if (provided !== decIso) {
          // For creation we only accept the computed Dec 31 option
          return res.status(400).json({ error: 'membershipExpiration must be the allowed Dec 31 date' });
        }
      }

      // Authorization check if club is specified
      if (club) {
        const isAuthorized =
          req.user.adminType === 'System Admin' ||
          req.user.adminType === 'Club Admin' ||
          (req.user.adminType === 'Member Admin' && club === req.user.clubId);

        if (!isAuthorized) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Validate club exists
        const clubExists = await Club.findById(club);
        if (!clubExists) {
          return res.status(400).json({ error: 'Club not found' });
        }
      }

      // Check if email already exists
      const existingMember = await Member.findOne({ email });
      if (existingMember) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      const member = new Member({
        firstName,
        lastName,
        email,
        phone: phone || '',
        streetAddress: streetAddress || '',
        address2: address2 || '',
        city: city || '',
        state: state || '',
        zip: zip || '',
        prefix: prefix || '',
        middleName: middleName || '',
        badgeNickname: badgeNickname || '',
        suffix: suffix || '',
        phoneType: phoneType || undefined,
        occupation: occupation || '',
        employer: employer || '',
        deceased: deceased || false,
        membershipType: membershipType || 'Full',
        membershipExpiration: membershipExpiration ? (function () { const p = String(membershipExpiration).split('T')[0]; const [y,m,d] = p.split('-'); return new Date(parseInt(y,10), parseInt(m,10)-1, parseInt(d,10)); })() : undefined,
        club: club || null,
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
    body('streetAddress').optional().trim(),
    body('address2').optional().trim(),
    body('city').optional().trim(),
    body('state').optional().trim(),
    body('zip').optional().trim(),
    body('prefix').optional().trim(),
    body('middleName').optional().trim(),
    body('badgeNickname').optional().trim(),
    body('suffix').optional().trim(),
    body('phoneType').optional().isIn(['Home', 'Cell', 'Work']).withMessage('Invalid phone type'),
    body('occupation').optional().trim(),
    body('employer').optional().trim(),
    body('deceased').optional().toBoolean(),
    body('membershipType')
      .optional()
      .isIn(['Full', 'Associate', 'Honorary', 'Inactive'])
      .withMessage('Invalid membership type'),
    body('club').optional().isMongoId().withMessage('Valid club ID'),
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
        (req.user.adminType === 'Member Admin' && member.club && member.club.toString() === req.user.clubId);

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const {
        firstName,
        lastName,
        email,
        phone,
        streetAddress,
        address2,
        city,
        state,
        zip,
        prefix,
        middleName,
        badgeNickname,
        suffix,
        phoneType,
        occupation,
        employer,
        deceased,
        membershipType,
        membershipExpiration,
        club,
      } = req.body;

      // Validate membershipExpiration if provided: cannot be cleared, and must match computed Dec 31 or existing expiration
      if (membershipExpiration !== undefined) {
        // Disallow clearing (empty string or null)
        if (membershipExpiration === null || membershipExpiration === '') {
          return res.status(400).json({ error: 'membershipExpiration cannot be cleared' });
        }

        const decIso = computeDec31Iso();
        const existing = member.membershipExpiration ? String(member.membershipExpiration).split('T')[0] : null;
        const provided = membershipExpiration ? String(membershipExpiration).split('T')[0] : null;
        const allowed = new Set([decIso]);
        if (existing) allowed.add(existing);
        if (provided && !allowed.has(provided)) {
          return res.status(400).json({ error: 'membershipExpiration must be either the existing expiration or the allowed Dec 31 date' });
        }
      }

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
      if (streetAddress !== undefined) member.streetAddress = streetAddress;
      if (address2 !== undefined) member.address2 = address2;
      if (city !== undefined) member.city = city;
      if (state !== undefined) member.state = state;
      if (zip !== undefined) member.zip = zip;
      if (prefix !== undefined) member.prefix = prefix;
      if (middleName !== undefined) member.middleName = middleName;
      if (badgeNickname !== undefined) member.badgeNickname = badgeNickname;
      if (suffix !== undefined) member.suffix = suffix;
      if (phoneType !== undefined) member.phoneType = phoneType;
      if (occupation !== undefined) member.occupation = occupation;
      if (employer !== undefined) member.employer = employer;
      if (deceased !== undefined) member.deceased = deceased;
      if (membershipType !== undefined) member.membershipType = membershipType;
      if (membershipExpiration !== undefined) {
        // membershipExpiration cannot be cleared (already validated). Store as local-date at midnight.
        const p = String(membershipExpiration).split('T')[0];
        const [y,m,d] = p.split('-');
        member.membershipExpiration = new Date(parseInt(y,10), parseInt(m,10)-1, parseInt(d,10));
      }
      if (club !== undefined) member.club = club || null;

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
      (req.user.adminType === 'Member Admin' && member.club && member.club.toString() === req.user.clubId);

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
