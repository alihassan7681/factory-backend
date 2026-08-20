const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    contact: { type: String, default: '' },
    category: { type: String, default: 'Raw Materials' },
    address: { type: String, default: '' },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Supplier', supplierSchema);
