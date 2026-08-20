const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: 'General' },
    brand: { type: String, default: 'Factory Fresh' },
    size: { type: String, default: '1 kg' },
    unit: { type: String, default: 'Kg' }, // 'Kg', 'Bottle', 'Jar', 'Piece', 'Box', 'Bundle'
    price: { type: Number, required: true },
    costPrice: { type: Number, default: 0 },
    currentStock: { type: Number, default: 0 },
    minStockAlert: { type: Number, default: 15 },
    icon: { type: String, default: '📦' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
