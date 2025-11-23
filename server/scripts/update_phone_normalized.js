const connectDB = require('../db');
const Member = require('../models/Member');

(async () => {
  try {
    await connectDB();
    console.log('Connected to DB, starting phone normalization...');
    const members = await Member.find().select('phone');
    let updated = 0;
    for (const m of members) {
      const norm = m.phone ? String(m.phone).replace(/\D/g, '') : undefined;
      if ((m.phoneNormalized || '') !== (norm || '')) {
        m.phoneNormalized = norm || undefined;
        await m.save();
        updated++;
      }
    }
    console.log(`Phone normalization complete. Members updated: ${updated}`);
    process.exit(0);
  } catch (err) {
    console.error('Phone normalization failed:', err);
    process.exit(1);
  }
})();
