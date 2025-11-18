/**
 * Add a System Admin directly to the Member collection
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Member = require('./models/Member');

const addSystemAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    const email = 'admin@example.com';
    const password = 'Gotest1!';

    // Check if member/admin already exists
    const existing = await Member.findOne({ email });
    if (existing && existing.adminType) {
      console.log(`✓ System Admin already exists: ${email}`);
      process.exit(0);
    }

    // Create or update member with admin fields
    let member = existing || new Member({
      firstName: 'Admin',
      lastName: 'User',
      email,
    });

    member.password = password;
    member.adminType = 'System Admin';
    member.club = null; // System Admin doesn't need a club

    await member.save();
    console.log(`✓ System Admin created/updated: ${email} (password: ${password})`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

addSystemAdmin();
