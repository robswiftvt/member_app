/**
 * 00000001_create_schema.js
 * Ensure Mongoose models are registered and indexes are created for production.
 * This script will:
 *  - connect to MongoDB using `server/.env` MONGO_URI
 *  - call `syncIndexes()` for Member and Club models (creates any schema indexes)
 *
 * Usage:
 *   node 00000001_create_schema.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const Member = require('../models/Member');
const Club = require('../models/Club');

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not found in server/.env');
    process.exit(2);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✓ Connected to MongoDB');

    console.log('\nEnsuring indexes for Member model...');
    await Member.syncIndexes();
    console.log('✓ Member indexes synced');

    console.log('\nEnsuring indexes for Club model...');
    await Club.syncIndexes();
    console.log('✓ Club indexes synced');

    // Optionally ensure collections exist by creating if missing
    const db = mongoose.connection.db;
    const existing = await db.listCollections({ name: 'members' }).toArray();
    if (!existing.length) {
      await db.createCollection('members');
      console.log('✓ Created `members` collection');
    }

    const existingClubs = await db.listCollections({ name: 'clubs' }).toArray();
    if (!existingClubs.length) {
      await db.createCollection('clubs');
      console.log('✓ Created `clubs` collection');
    }

    console.log('\nSchema setup complete');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error during schema setup:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
})();
