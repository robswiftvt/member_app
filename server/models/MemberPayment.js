const mongoose = require('mongoose');

const memberPaymentSchema = new mongoose.Schema(
  {
    paymentId: { type: String, unique: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
    clubPayment: { type: mongoose.Schema.Types.ObjectId, ref: 'ClubPayment', required: true },
    amount: { type: Number, required: true },
    clubYear: { type: Number, required: true },
  },
  { timestamps: true }
);

memberPaymentSchema.pre('validate', function (next) {
  if (!this.paymentId) {
    this.paymentId = `MP-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffff).toString(16)}`;
  }
  next();
});

module.exports = mongoose.model('MemberPayment', memberPaymentSchema);
