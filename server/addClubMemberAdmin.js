require('dotenv').config();
const mongoose = require('mongoose');

const Club = require('./models/Club');
const Member = require('./models/Member');
const Admin = require('./models/Admin');

async function main() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGO_URI (or MONGODB_URI) not set in .env');
    }

    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // 1) Ensure Club exists
    const clubName = 'Non-Club Administrators';
    let club = await Club.findOne({ name: clubName });
    if (club) {
      console.log(`Club '${clubName}' already exists (id: ${club._id})`);
    } else {
      club = new Club({ name: clubName, homePage: '', location: '', status: 'Active' });
      await club.save();
      console.log(`Created club '${clubName}' (id: ${club._id})`);
    }

    // 2) Ensure Member exists
    const memberEmail = 'robswiftvt@gmail.com'.toLowerCase();
    let member = await Member.findOne({ email: memberEmail });
    if (member) {
      console.log(`Member with email '${memberEmail}' already exists (id: ${member._id})`);
      // If member exists but not assigned to this club, update
      if (!member.club || member.club.toString() !== club._id.toString()) {
        member.club = club._id;
        await member.save();
        console.log(`Assigned existing member to club '${clubName}'`);
      }
    } else {
      member = new Member({
        firstName: 'Rob',
        lastName: 'Swift',
        email: memberEmail,
        address: '',
        phone: '',
        membershipType: 'Full',
        club: club._id,
      });
      await member.save();
      console.log(`Created member 'Rob Swift' (id: ${member._id})`);
    }

    // 3) Ensure Admin exists (username 'admin')
    const adminUsername = 'admin';
    let admin = await Admin.findOne({ username: adminUsername });
    if (admin) {
      console.log(`Admin with username '${adminUsername}' already exists (id: ${admin._id})`);
      // If admin exists but different member, show info
      if (admin.member && admin.member.toString() !== member._id.toString()) {
        console.log(`Note: existing admin is linked to member id ${admin.member}`);
      }
    } else {
      // Also check if this member already has an admin record
      const existingForMember = await Admin.findOne({ member: member._id });
      if (existingForMember) {
        console.log(`Member already has an admin account (username: ${existingForMember.username}). Skipping creation.`);
      } else {
        admin = new Admin({
          username: adminUsername,
          password: 'Gotest1!',
          adminType: 'System Admin',
          member: member._id,
        });
        await admin.save();
        console.log(`Created System Admin '${adminUsername}' (id: ${admin._id}) linked to member id ${member._id}`);
      }
    }

    console.log('\nOperation complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();
