const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String },
    customerId: { type: String, default: null },
    customerName: { type: String, default: 'Walk-in Customer' },
    customerContact: { type: String, default: '' },
    items: [
      {
        productId: { type: String },
        name: { type: String, required: true },
        unit: { type: String, default: 'Kg' },
        qty: { type: Number, required: true },
        price: { type: Number, required: true },
        costPrice: { type: Number, default: 0 },
        subtotal: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    advancePaid: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    dueDate: { type: String, default: null },
    promiseDays: { type: Number, default: 0 },
    status: {
      type: String,
      default: 'Pending',
    },
    paymentHistory: [
      {
        amount: { type: Number, required: true },
        date: { type: String, default: () => new Date().toISOString() },
        note: { type: String, default: 'Payment' },
      },
    ],
    orderDate: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
