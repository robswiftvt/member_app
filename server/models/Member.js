const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const memberSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    // Address fields (top-level for easier mapping from request body)
    streetAddress: { type: String, trim: true },
    address2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zip: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    // Additional personal/contact fields
    prefix: {
      type: String,
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
    },
    badgeNickname: {
      type: String,
      trim: true,
    },
    suffix: {
      type: String,
      trim: true,
    },
    phoneType: {
      type: String,
      enum: ['Home', 'Cell', 'Work'],
    },
    occupation: {
      type: String,
      trim: true,
    },
    employer: {
      type: String,
      trim: true,
    },
    deceased: {
      type: Boolean,
      default: false,
    },
    membershipType: {
      type: String,
      enum: ['Full', 'Associate', 'Honorary', 'Inactive'],
      default: 'Full',
    },
    membershipExpiration: {
      type: Date,
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: false,
    },
    // Admin fields (null if member is not an admin)
    password: {
      type: String,
      default: null,
    },
    adminType: {
      type: String,
      enum: ['System Admin', 'Club Admin', 'Member Admin'],
      // Store undefined when no admin type is set so enum validator is skipped
      default: undefined,
      set: (v) => (v === '' || v === null ? undefined : v),
    },
  },
  { timestamps: true }
);

// Hash password before saving (only if modified)
memberSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
memberSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Member', memberSchema);
