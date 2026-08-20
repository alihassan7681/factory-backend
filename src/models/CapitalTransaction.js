const mongoose = require('mongoose');

const capitalTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['CASH_IN', 'CASH_OUT'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    date: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
    category: {
      type: String,
      default: 'General Factory Expense',
    },
    sourceOrDestination: {
      type: String,
      default: 'Owner Pocket (Cash)',
    },
    note: {
      type: String,
      default: '',
    },
    recordedBy: {
      type: String,
      default: 'Owner / Factory Admin',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CapitalTransaction', capitalTransactionSchema);
