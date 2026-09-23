const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    contact: { type: String, default: '' },
    address: { type: String, default: '' },
    totalPurchased: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    advanceBalance: { type: Number, default: 0 }, // Credit: customer ne zyada diya, hum unke qarzdar hain
    ability: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
