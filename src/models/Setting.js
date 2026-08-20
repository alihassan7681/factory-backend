const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: 'Freshly Foods' },
    tagline: { type: String, default: 'Factory Manufacturing & Food Processing' },
    address: { type: String, default: 'Plot 42-B, Industrial Estate, Lahore' },
    phone: { type: String, default: '0300-1234567' },
    email: { type: String, default: 'info@freshlyfoods.pk' },
    ntn: { type: String, default: '' },
    strn: { type: String, default: '' },
    currency: { type: String, default: 'PKR' },
    invoicePrefix: { type: String, default: 'INV' },
    taxPercent: { type: Number, default: 0 },
    adminName: { type: String, default: 'Factory Admin' },
    adminEmail: { type: String, default: 'admin@factory.com' },
    adminPassword: { type: String, default: 'admin123' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);

