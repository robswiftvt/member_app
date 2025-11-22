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
    const { clubId } = req.query;
    const query = {};
    if (clubId) query.club = clubId;

    const payments = await Payment.find(query).populate('club', 'name').sort({ date: -1 });
    res.json(payments);
  } catch (err) {
    console.error('Fetch payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// GET single payment
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const p = await Payment.findById(req.params.id).populate('club', 'name');
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
    body('clubFeeAmount').notEmpty().isFloat({ gt: 0 }).withMessage('Club fee amount required'),
    body('date').notEmpty().isISO8601().toDate().withMessage('Valid date required'),
    body('clubYear').notEmpty().isInt({ min: 1900 }).withMessage('Valid club year required'),
    body('status').optional().isIn(['Pending', 'Received', 'Paid']).withMessage('Invalid status'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { club, clubFeeAmount, date, clubYear, status } = req.body;

      // Validate club exists
      const clubExists = await Club.findById(club);
      if (!clubExists) return res.status(400).json({ error: 'Club not found' });

      const payment = new Payment({ club, clubFeeAmount, date, clubYear, status: status || 'Pending' });
      await payment.save();
      const populated = await payment.populate('club', 'name');
      res.status(201).json(populated);
    } catch (err) {
      console.error('Create payment error:', err);
      res.status(500).json({ error: 'Failed to create payment' });
    }
  }
);

module.exports = router;
