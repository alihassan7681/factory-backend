require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const Product = require('./models/Product');
const Customer = require('./models/Customer');
const Order = require('./models/Order');
const Employee = require('./models/Employee');
const ProductionLog = require('./models/ProductionLog');
const Supplier = require('./models/Supplier');
const PurchaseOrder = require('./models/PurchaseOrder');
const Payroll = require('./models/Payroll');
const Setting = require('./models/Setting');

const clearAllData = async () => {
  try {
    await connectDB();
    console.log('🔄 Wiping all data across MongoDB database to Zero (0)...');

    await Promise.all([
      Product.deleteMany({}),
      Customer.deleteMany({}),
      Order.deleteMany({}),
      Employee.deleteMany({}),
      ProductionLog.deleteMany({}),
      Supplier.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      Payroll.deleteMany({}),
      Setting.deleteMany({}),
    ]);

    // Create fresh default company settings for A.FOODS
    await Setting.create({
      companyName: 'A.FOODS',
      tagline: 'Manufacturing & Distribution (Kips · Mr Tomato)',
      address: 'Chack #. 241 RB Talib Wala Jhang Road, Fsd.',
      phone: '0300-7662290',
      email: 'info@afoods.pk',
      currency: 'PKR',
      invoicePrefix: 'INV',
      taxPercent: 0,
    });

    console.log('✅ All MongoDB collections wiped clean! Database is now at Zero (0).');
    process.exit(0);
  } catch (error) {
    console.error('❌ Clear Error:', error);
    process.exit(1);
  }
};

clearAllData();
