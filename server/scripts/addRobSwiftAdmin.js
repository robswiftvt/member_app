require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin.legacy');
const Member = require('./models/Member');

async function addRobSwiftAsAdmin() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGO_URI (or MONGODB_URI) not set in .env');
    }

    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // Find Rob Swift member
    const member = await Member.findOne({ email: 'robswiftvt@gmail.com' });
    if (!member) {
      console.log('Rob Swift member not found');
      process.exit(0);
    }

    console.log(`Found member: ${member.firstName} ${member.lastName} (${member.email})`);

    // Check if already an admin
    const existingAdmin = await Admin.findOne({ member: member._id });
    if (existingAdmin) {
      console.log('Rob Swift is already an admin');
      process.exit(0);
    }

    // Create System Admin for Rob Swift
    const admin = new Admin({
      password: 'Gotest1!',
      adminType: 'System Admin',
      member: member._id,
    });

    await admin.save();
    console.log('✓ Rob Swift added as System Admin successfully');
    console.log(`  Email: ${member.email}`);
    console.log(`  Password: Gotest1!`);
    console.log(`  Admin Type: System Admin`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

addRobSwiftAsAdmin();
