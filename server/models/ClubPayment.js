const mongoose = require('mongoose');

const clubPaymentSchema = new mongoose.Schema(
  {
    paymentId: { type: String, unique: true, index: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
    status: { type: String, enum: ['Pending', 'Received', 'Paid'], default: 'Pending' },
    clubFeeAmount: { type: Number, required: true },
    date: { type: Date, required: true },
    clubYear: { type: Number, required: true },
  },
  { timestamps: true }
);

// Generate a simple unique paymentId if not provided
clubPaymentSchema.pre('validate', function (next) {
  if (!this.paymentId) {
    this.paymentId = `CP-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffff).toString(16)}`;
  }
  next();
});

module.exports = mongoose.model('ClubPayment', clubPaymentSchema);
