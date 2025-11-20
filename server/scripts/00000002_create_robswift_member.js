/**
 * 00000002_create_robswift_member.js
 * Create or update the Rob Swift member as a System Admin.
 * This script will:
 *  - connect to MongoDB using `server/.env` MONGO_URI
 *  - create or update member with email `robswiftvt@gmail.com` with adminType `System Admin`
 *  - set password to the provided value (defaults to `Gotest1!`)
 *
 * Usage:
 *   node 00000002_create_robswift_member.js [--password=YourPass]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Member = require('../models/Member');

const argv = require('minimist')(process.argv.slice(2));
const password = argv.password || argv.p || 'Gotest1!';

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

    const email = 'robswiftvt@gmail.com';
    let member = await Member.findOne({ email });

    if (!member) {
      member = new Member({
        firstName: 'Rob',
        lastName: 'Swift',
        email,
        phone: '',
        membershipType: 'Full',
        club: null,
      });
      console.log('Creating new member for Rob Swift...');
    } else {
      console.log('Found existing member for Rob Swift, updating...');
    }

    member.password = password;
    member.adminType = 'System Admin';
    member.club = null;

    await member.save();
    console.log(`✓ Rob Swift member created/updated: ${email} (password: ${password})`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error creating/updating Rob Swift member:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
})();
