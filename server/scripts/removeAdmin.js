require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin.legacy');
const Member = require('./models/Member');

async function removeAdmin() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGO_URI (or MONGODB_URI) not set in .env');
    }

    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // Find the admin named 'admin' by looking for the associated member
    const admin = await Admin.findOne().populate('member');
    
    if (!admin) {
      console.log('No admin found to delete.');
      process.exit(0);
    }

    console.log(`Found admin: ${admin.member.email} (${admin.adminType})`);

    // Delete the admin
    await Admin.deleteOne({ _id: admin._id });
    console.log(`✓ Admin deleted successfully`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

removeAdmin();
