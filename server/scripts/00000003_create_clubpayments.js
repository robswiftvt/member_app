require('dotenv').config();
const mongoose = require('mongoose');
const ClubPayment = require('../models/ClubPayment');
const Club = require('../models/Club');

async function main() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGO_URI not set in .env');

    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // Ensure indexes for ClubPayment are created (this will create the collection if needed)
    await ClubPayment.syncIndexes();
    console.log('ClubPayment indexes synced (collection created if missing).');

    // Optional: seed a sample ClubPayment if CLI args provided: --seed --clubId=<id>
    const args = process.argv.slice(2);
    const seed = args.includes('--seed');
    const clubArg = args.find((a) => a.startsWith('--clubId='));
    const clubId = clubArg ? clubArg.split('=')[1] : null;

    if (seed) {
      if (!clubId) {
        console.log('Skipping seed: provide --clubId=<clubId> to seed a sample ClubPayment');
      } else {
        const clubExists = await Club.findById(clubId);
        if (!clubExists) {
          console.log(`Club with id ${clubId} not found. Seed aborted.`);
        } else {
          const sample = new ClubPayment({
            club: clubId,
            clubFeeAmount: 100.0,
            date: new Date(),
            clubYear: new Date().getFullYear(),
            status: 'Pending',
          });
          await sample.save();
          console.log(`Inserted sample ClubPayment with id ${sample._id} and paymentId ${sample.paymentId}`);
        }
      }
    }

    console.log('Operation complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();
