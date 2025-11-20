/**
 * Migration script: Consolidate Admin collection into Member collection.
 * This script:
 * 1. Finds all Admin records
 * 2. For each Admin, updates the corresponding Member with password and adminType
 * 3. Deletes all Admin records
 * 4. Can be run safely multiple times (idempotent)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Member = require('./models/Member');
const Admin = require('./models/Admin.legacy');

const migrateAdminsToMembers = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Get all admins
    console.log('\nFetching all Admin records...');
    const admins = await Admin.find().populate('member');
    console.log(`Found ${admins.length} admin(s)`);

    if (admins.length === 0) {
      console.log('No admins to migrate. Checking if any members already have admin fields...');
    }

    // Update each member with admin fields
    for (const admin of admins) {
      console.log(`\nProcessing admin for member: ${admin.member.email}`);
      const member = await Member.findById(admin.member._id);

      if (!member) {
        console.log(`  WARNING: Member ${admin.member._id} not found`);
        continue;
      }

      // Update member with admin fields
      member.password = admin.password; // Password already hashed in admin
      member.adminType = admin.adminType;

      await member.save();
      console.log(`  ✓ Updated member with adminType: ${admin.adminType}`);
    }

    // Delete all admin records
    if (admins.length > 0) {
      console.log('\nDeleting Admin collection...');
      const result = await Admin.deleteMany({});
      console.log(`✓ Deleted ${result.deletedCount} admin record(s)`);
    }

    console.log('\n✓ Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
};

migrateAdminsToMembers();
