/**
 * Reset passwords for all admins to known values
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Member = require('./models/Member');

const resetAdminPasswords = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Define new passwords for each admin
    const adminPasswords = {
      'robswiftvt@gmail.com': 'Gotest1!',
      'letsgobrandon@phillies.com': 'Gotest1!',
      'joe@admin.com': 'Gotest1!',
    };

    for (const [email, newPassword] of Object.entries(adminPasswords)) {
      const member = await Member.findOne({ email });
      if (!member) {
        console.log(`✗ ${email} not found`);
        continue;
      }

      console.log(`Resetting password for ${email}...`);
      member.password = newPassword;
      await member.save();
      console.log(`✓ Password reset for ${email}`);

      // Verify it worked
      const isMatch = await member.comparePassword(newPassword);
      console.log(`  Password verification: ${isMatch ? '✓ PASS' : '✗ FAIL'}\n`);
    }

    console.log('✓ All admin passwords reset successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

resetAdminPasswords();
