const express = require('express');
const { body, validationResult } = require('express-validator');
const MemberPayment = require('../models/MemberPayment');
const ClubPayment = require('../models/ClubPayment');
const Member = require('../models/Member');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET member payments for a club
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { clubId, clubPayment } = req.query;
    const query = {};
    if (clubId) query.club = clubId;
    if (clubPayment) query.clubPayment = clubPayment;
    // include membershipType on populated member so clients can show the type in member payment lists
    const list = await MemberPayment.find(query)
      .populate('member', 'firstName lastName email membershipType')
      .populate('clubPayment', 'paymentId clubYear');
    res.json(list);
  } catch (err) {
    console.error('Fetch member payments error:', err);
    res.status(500).json({ error: 'Failed to fetch member payments' });
  }
});

// POST create member payment
router.post(
  '/',
  authMiddleware,
  [
    body('member').notEmpty().isMongoId().withMessage('Valid member ID required'),
    body('club').notEmpty().isMongoId().withMessage('Valid club ID required'),
    body('clubPayment').notEmpty().isMongoId().withMessage('Valid clubPayment ID required'),
    body('amount').notEmpty().isFloat({ gt: 0 }).withMessage('Amount required'),
    body('clubYear').notEmpty().isInt({ min: 1900 }).withMessage('Valid club year required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { member, club, clubPayment, amount, clubYear } = req.body;

      // Validate member exists
      const m = await Member.findById(member);
      if (!m) return res.status(400).json({ error: 'Member not found' });

      // Validate clubPayment exists
      const cp = await ClubPayment.findById(clubPayment);
      if (!cp) return res.status(400).json({ error: 'ClubPayment not found' });

      const mp = new MemberPayment({ member, club, clubPayment, amount, clubYear });
      await mp.save();
      const populated = await mp.populate('member', 'firstName lastName email');
      res.status(201).json(populated);
    } catch (err) {
      console.error('Create member payment error:', err);
      res.status(500).json({ error: 'Failed to create member payment' });
    }
  }
);

// GET unpaid members for a club & clubYear
// returns members who have membershipExpiration in that clubYear and do NOT have a MemberPayment for that clubYear
router.get('/unpaid', authMiddleware, async (req, res) => {
  try {
    const { clubId, clubYear } = req.query;
    if (!clubId || !clubYear) return res.status(400).json({ error: 'clubId and clubYear required' });

    const year = parseInt(clubYear, 10);
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    // members in club with membershipExpiration in the year
    // include membershipType so clients can render the correct row type
    // exclude Associate members — they should not appear on the Unpaid Members grid
    const members = await Member.find({
      club: clubId,
      membershipExpiration: { $gte: start, $lt: end },
      membershipType: { $ne: 'Associate' },
    }).select('firstName lastName email membershipExpiration membershipType');

    // find member payments for that clubYear
    const payments = await MemberPayment.find({ club: clubId, clubYear: year }).select('member');
    const paidMemberIds = new Set(payments.map((p) => p.member.toString()));

    const unpaid = members.filter((m) => !paidMemberIds.has(m._id.toString()));
    res.json(unpaid);
  } catch (err) {
    console.error('Fetch unpaid members error:', err);
    res.status(500).json({ error: 'Failed to fetch unpaid members' });
  }
});

module.exports = router;
