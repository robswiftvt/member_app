const express = require('express');
const { body, validationResult } = require('express-validator');
const Payment = require('../models/ClubPayment');
const Club = require('../models/Club');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET payments (optionally filter by clubId)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { clubId, clubYear } = req.query;
    const query = {};
    if (clubId) query.club = clubId;
    if (clubYear) query.clubYear = Number(clubYear);

    const payments = await Payment.find(query)
      .populate('club', 'name')
      .populate('receivedByMember', 'firstName lastName email')
      .sort({ date: -1 });
    res.json(payments);
  } catch (err) {
    console.error('Fetch payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// GET single payment
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const p = await Payment.findById(req.params.id)
      .populate('club', 'name')
      .populate('receivedByMember', 'firstName lastName email');
    if (!p) return res.status(404).json({ error: 'Payment not found' });
    res.json(p);
  } catch (err) {
    console.error('Fetch payment error:', err);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// POST create new payment
router.post(
  '/',
  authMiddleware,
  [
    body('club').notEmpty().isMongoId().withMessage('Valid club ID required'),
    body('clubFeeAmount').notEmpty().isFloat({ min: 0 }).withMessage('Club fee amount required'),
    body('date').notEmpty().isISO8601().toDate().withMessage('Valid date required'),
    body('clubYear').notEmpty().isInt({ min: 1900 }).withMessage('Valid club year required'),
    body('status').optional().isIn(['Pending', 'Received', 'Paid']).withMessage('Invalid status'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      let { club, clubFeeAmount, date, clubYear, status } = req.body;

      // Validate club exists
      const clubExists = await Club.findById(club);
      if (!clubExists) return res.status(400).json({ error: 'Club not found' });

      // If there's already a club-level payment with a non-zero clubFeeAmount for this club/year,
      // do not charge the club fee again. Override incoming clubFeeAmount to 0 in that case.
      const existing = await Payment.findOne({ club, clubYear, clubFeeAmount: { $gt: 0 } });
      const fee = existing ? 0 : Number(clubFeeAmount || 0);

      const payment = new Payment({ club, clubFeeAmount: fee, date, clubYear, status: status || 'Pending' });
      await payment.save();
      const populated = await payment.populate('club', 'name');
      res.status(201).json(populated);
    } catch (err) {
      console.error('Create payment error:', err);
      res.status(500).json({ error: 'Failed to create payment' });
    }
  }
);

// PATCH update payment (status update)
router.patch(
  '/:id',
  authMiddleware,
  [body('status').notEmpty().isIn(['Pending', 'Received', 'Paid']).withMessage('Invalid status')],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Only System or Club Admins can change payment status
      const userType = req.user?.adminType || '';
      // Accept both full and short labels to be tolerant during client/token mismatches
      const allowed = ['System Admin', 'Club Admin', 'System', 'Club'];
      if (!allowed.includes(userType)) {
        console.warn('Permission denied for payment update. userType=', userType, 'memberId=', req.user?.memberId || req.user?.id || 'unknown');
        return res.status(403).json({ error: 'Insufficient permissions', yourRole: userType });
      }

      const payment = await Payment.findById(req.params.id);
      if (!payment) return res.status(404).json({ error: 'Payment not found' });

      // set or clear received info
      payment.status = req.body.status;
      if (req.body.status === 'Received') {
        payment.receivedAt = new Date();
        if (req.user && req.user.memberId) payment.receivedByMember = req.user.memberId;
      } else {
        payment.receivedAt = undefined;
        payment.receivedByMember = undefined;
      }

      await payment.save();
      const populated = await Payment.findById(payment._id)
        .populate('club', 'name')
        .populate('receivedByMember', 'firstName lastName email');
      res.json(populated);
    } catch (err) {
      console.error('Update payment error:', err);
      res.status(500).json({ error: 'Failed to update payment' });
    }
  }
);

module.exports = router;
