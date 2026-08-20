const mongoose = require('mongoose');

const productionLogSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: 'Kg' },
    date: { type: String, default: () => new Date().toISOString() },
    notes: { type: String, default: 'Daily Production Run' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProductionLog', productionLogSchema);
