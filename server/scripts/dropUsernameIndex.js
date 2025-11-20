require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin.legacy');

async function dropUsernameIndex() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGO_URI (or MONGODB_URI) not set in .env');
    }

    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // Drop the old username index
    try {
      await Admin.collection.dropIndex('username_1');
      console.log('✓ Dropped username_1 index');
    } catch (err) {
      if (err.message.includes('index not found')) {
        console.log('Index username_1 does not exist (already dropped)');
      } else {
        throw err;
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

dropUsernameIndex();
