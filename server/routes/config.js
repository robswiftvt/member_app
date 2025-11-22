const express = require('express');
const router = express.Router();

// Public config endpoint returning server-side configurable values
router.get('/', (req, res) => {
  const cutoffMonth = parseInt(process.env.NEW_MEMBER_CUTOFF_MONTH || '10', 10);
  const cutoffDay = parseInt(process.env.NEW_MEMBER_CUTOFF_DAY || '30', 10);
  res.json({ newMemberCutoffMonth: cutoffMonth, newMemberCutoffDay: cutoffDay });
});

module.exports = router;
