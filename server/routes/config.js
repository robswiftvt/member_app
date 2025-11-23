const express = require('express');
const router = express.Router();

// Public config endpoint returning server-side configurable values
router.get('/', (req, res) => {
  const cutoffMonth = parseInt(process.env.NEW_MEMBER_CUTOFF_MONTH || '10', 10);
  const cutoffDay = parseInt(process.env.NEW_MEMBER_CUTOFF_DAY || '30', 10);
  const clubFeeAmount = parseFloat(process.env.CLUB_FEE_AMOUNT || '15');
  const memberFeeAmount = parseFloat(process.env.MEMBER_FEE_AMOUNT || '25');
  const honoraryFeeAmount = parseFloat(process.env.HONORARY_FEE_AMOUNT || '20');

  res.json({
    newMemberCutoffMonth: cutoffMonth,
    newMemberCutoffDay: cutoffDay,
    clubFeeAmount,
    memberFeeAmount,
    honoraryFeeAmount,
  });
});

module.exports = router;
