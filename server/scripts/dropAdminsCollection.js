const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not found in server/.env');
    process.exit(2);
  }

  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = mongoose.connection.db;

    const collections = await db.listCollections({ name: 'admins' }).toArray();
    if (!collections.length) {
      console.log('No `admins` collection found — nothing to drop.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Safety prompt: require --yes flag to actually drop
    const args = process.argv.slice(2);
    const confirm = args.includes('--yes') || args.includes('-y');
    if (!confirm) {
      console.log('Found `admins` collection. To drop it, re-run with `--yes` or `-y` flag.');
      console.log('Example: node dropAdminsCollection.js --yes');
      await mongoose.disconnect();
      process.exit(0);
    }

    await db.dropCollection('admins');
    console.log('Dropped `admins` collection successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error dropping admins collection:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
})();
