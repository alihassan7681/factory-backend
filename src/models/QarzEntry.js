const mongoose = require('mongoose');

const qarzEntrySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['liya', 'dia'], // liya = borrowed FROM someone, dia = given TO someone
      required: true,
    },
    personName: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    dueDate: {
      type: String, // YYYY-MM-DD (optional)
      default: '',
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    paidBack: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'partial', 'cleared'],
      default: 'pending',
    },
    payments: [
      {
        amount: { type: Number, required: true },
        date: { type: String, required: true },
        note: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

// Auto-calculate status before save
qarzEntrySchema.pre('save', function (next) {
  const remaining = this.amount - this.paidBack;
  if (this.paidBack <= 0) {
    this.status = 'pending';
  } else if (remaining <= 0) {
    this.status = 'cleared';
  } else {
    this.status = 'partial';
  }
  next();
});

module.exports = mongoose.model('QarzEntry', qarzEntrySchema);
