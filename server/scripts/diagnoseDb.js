/**
 * Diagnostic script to check database state and add test admin if needed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Member = require('./models/Member');

const checkDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Check Members collection
    const memberCount = await Member.countDocuments();
    console.log(`Members in collection: ${memberCount}`);

    // Check for admins in Members collection
    const admins = await Member.find({ adminType: { $ne: null } });
    console.log(`Members with adminType: ${admins.length}`);
    
    if (admins.length > 0) {
      console.log('\nExisting admins:');
      admins.forEach((a) => {
        console.log(`  - ${a.email} (${a.adminType})`);
      });
    }

    // List all members to understand the data
    console.log('\nAll members:');
    const allMembers = await Member.find().select('email firstName lastName adminType');
    if (allMembers.length === 0) {
      console.log('  (none found)');
    } else {
      allMembers.forEach((m) => {
        console.log(`  - ${m.email} | ${m.firstName} ${m.lastName} | adminType: ${m.adminType || '(none)'}`);
      });
    }

    // If no admins, create one
    if (admins.length === 0 && allMembers.length > 0) {
      console.log('\nNo admins found. Creating test System Admin...');
      const testAdmin = new Member({
        firstName: 'Test',
        lastName: 'Admin',
        email: 'admin@test.com',
        password: 'Gotest1!',
        adminType: 'System Admin',
        club: null,
      });
      await testAdmin.save();
      console.log('✓ Test System Admin created: admin@test.com / Gotest1!');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

checkDatabase();
