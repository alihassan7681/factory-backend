const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema(
  {
    orderNo: { type: String },
    supplierId: { type: String },
    supplierName: { type: String, required: true },
    supplierContact: { type: String, default: '' },
    item: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: 'Kg' },
    estimatedCost: { type: Number, default: 0 },
    expectedDelivery: { type: String },
    priority: { type: String, default: 'Normal' },
    status: {
      type: String,
      default: 'Pending',
    },
    receivedDate: { type: String },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
