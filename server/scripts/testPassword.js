/**
 * Test password comparison for an admin
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Member = require('./models/Member');

const testPasswordComparison = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    const email = 'robswiftvt@gmail.com';
    const testPassword = 'Gotest1!';

    const member = await Member.findOne({ email });
    if (!member) {
      console.log(`✗ Member not found: ${email}`);
      process.exit(1);
    }

    console.log(`Found member: ${member.firstName} ${member.lastName}`);
    console.log(`Email: ${member.email}`);
    console.log(`Admin Type: ${member.adminType}`);
    console.log(`Has password field: ${!!member.password}`);
    console.log(`Password hash: ${member.password ? member.password.substring(0, 20) + '...' : '(none)'}\n`);

    if (!member.password) {
      console.log('✗ Member has no password! Cannot authenticate.');
      process.exit(1);
    }

    if (!member.comparePassword) {
      console.log('✗ comparePassword method not found on member!');
      console.log(`Member methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(member))}`);
      process.exit(1);
    }

    console.log(`Testing password comparison with: "${testPassword}"`);
    const isMatch = await member.comparePassword(testPassword);
    console.log(`Password match result: ${isMatch}\n`);

    if (isMatch) {
      console.log('✓ Password comparison successful!');
    } else {
      console.log('✗ Password does not match. Trying with different passwords...');
      // Try common passwords to see if any match
      const commonPasswords = ['password', 'admin', '123456', 'Gotest1', 'gotest1!', 'Gotest1!'];
      for (const pwd of commonPasswords) {
        const match = await member.comparePassword(pwd);
        if (match) {
          console.log(`  ✓ Found matching password: ${pwd}`);
        }
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err);
    process.exit(1);
  }
};

testPasswordComparison();
