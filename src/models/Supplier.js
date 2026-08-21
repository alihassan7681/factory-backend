const mongoose = require('mongoose');

const supplierTransactionSchema = new mongoose.Schema(
  {
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
    type: { type: String, enum: ['PURCHASE', 'PAYMENT'], required: true },
    amount: { type: Number, required: true },
    billNo: { type: String, default: '' },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    contact: { type: String, default: '' },
    category: { type: String, default: 'Raw Materials' },
    address: { type: String, default: '' },
    totalPurchased: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    transactions: [supplierTransactionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Supplier', supplierSchema);
