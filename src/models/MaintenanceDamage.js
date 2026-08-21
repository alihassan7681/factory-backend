const mongoose = require('mongoose');

const maintenanceDamageSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['repair', 'broken', 'replacement'], // repair = maramat, broken = tut phut, replacement = tabdeeli
      required: true,
    },
    cost: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    reportedBy: {
      type: String,
      default: 'Staff',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'fixed', 'discarded'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MaintenanceDamage', maintenanceDamageSchema);
