const mongoose = require('mongoose');

const roznamchaEntrySchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      unique: true,
    },
    openingBalance: {
      type: Number, // سابقہ بقایا رقم
      default: 0,
    },
    incomeEntries: [
      {
        description: { type: String, required: true }, // تفصیل آمدن
        pageNo: { type: String, default: '' }, // صفحہ / کھاتہ نمبر
        amount: { type: Number, required: true, min: 0 }, // رقم
        note: { type: String, default: '' },
      },
    ],
    expenseEntries: [
      {
        section: { type: String, default: 'expenses' }, // 'khana', 'expenses', 'services', 'advance'
        description: { type: String, required: true }, // تفصیل خرچ
        pageNo: { type: String, default: '' }, // صفحہ / کھاتہ نمبر
        amount: { type: Number, required: true, min: 0 }, // رقم
        note: { type: String, default: '' },
      },
    ],
    totalIncome: {
      type: Number,
      default: 0,
    },
    totalExpense: {
      type: Number,
      default: 0,
    },
    closingBalance: {
      type: Number, // بقیہ رقم
      default: 0,
    },
    note: {
      type: String,
      default: '',
    },
    recordedBy: {
      type: String,
      default: 'Munshi / Cashier',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RoznamchaEntry', roznamchaEntrySchema);
