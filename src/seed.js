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

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('🔄 Clearing old collections in MongoDB...');

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

    console.log('🌱 Seeding fresh factory data into MongoDB...');

    // 1. Products
    const products = await Product.insertMany([
      {
        name: 'Classic Tomato Ketchup',
        category: 'Sauces',
        brand: 'Freshly',
        size: '1 kg',
        unit: 'Kg',
        price: 450,
        costPrice: 280,
        currentStock: 120,
        minStockAlert: 20,
        icon: '🍅',
      },
      {
        name: 'Chilli Garlic Sauce',
        category: 'Sauces',
        brand: 'Freshly',
        size: '800 g',
        unit: 'Bottle',
        price: 520,
        costPrice: 320,
        currentStock: 45,
        minStockAlert: 15,
        icon: '🌶️',
      },
      {
        name: 'Mango Jam (Commercial)',
        category: 'Jams',
        brand: 'Freshly',
        size: '5 kg',
        unit: 'Kg',
        price: 1850,
        costPrice: 1100,
        currentStock: 18,
        minStockAlert: 10,
        icon: '🥭',
      },
      {
        name: 'Creamy Mayonnaise Master Pack',
        category: 'Mayonnaise',
        brand: 'Freshly',
        size: '10 kg Box',
        unit: 'Box',
        price: 4200,
        costPrice: 2600,
        currentStock: 8,
        minStockAlert: 10,
        icon: '🥚',
      },
      {
        name: 'Dark Soya Sauce',
        category: 'Sauces',
        brand: 'Freshly',
        size: '500 ml',
        unit: 'Bottle',
        price: 480,
        costPrice: 290,
        currentStock: 65,
        minStockAlert: 20,
        icon: '🫘',
      },
      {
        name: 'Strawberry Fruit Jam',
        category: 'Jams',
        brand: 'Freshly',
        size: '450 g',
        unit: 'Jar',
        price: 420,
        costPrice: 240,
        currentStock: 30,
        minStockAlert: 12,
        icon: '🍓',
      },
    ]);

    // 2. Customers
    const customers = await Customer.insertMany([
      {
        name: 'City Mart Super Store',
        contact: '0300-1234567',
        address: 'Main Market, Lahore',
        totalPurchased: 184500,
        totalPaid: 135000,
        remainingBalance: 49500,
      },
      {
        name: 'Khan Wholesale Traders',
        contact: '0321-8876543',
        address: 'Grain Market, Gujranwala',
        totalPurchased: 126800,
        totalPaid: 126800,
        remainingBalance: 0,
      },
      {
        name: 'Al-Fatah Foods & Bakers',
        contact: '0308-4552100',
        address: 'Gulberg III, Lahore',
        totalPurchased: 98000,
        totalPaid: 65000,
        remainingBalance: 33000,
      },
    ]);

    // 3. Employees
    const employees = await Employee.insertMany([
      {
        name: 'Muhammad Ali Raza',
        role: 'Store & Inventory Manager',
        phone: '0301-8829011',
        cnic: '35202-1847623-1',
        salary: 45000,
        status: 'Active',
      },
      {
        name: 'Tariq Mahmood',
        role: 'Production Supervisor',
        phone: '0312-5013390',
        cnic: '35201-9923145-3',
        salary: 65000,
        status: 'Active',
      },
      {
        name: 'Sana Ahmed',
        role: 'Sales & Billing Officer',
        phone: '0334-2120455',
        cnic: '35200-4321098-2',
        salary: 42000,
        status: 'Active',
      },
    ]);

    // 4. Suppliers
    const suppliers = await Supplier.insertMany([
      {
        name: 'Agro Supplies Pvt. Ltd.',
        contact: '0300-9876543',
        category: 'Raw Materials',
        address: 'Multan Road, Lahore',
      },
      {
        name: 'National Packaging Co.',
        contact: '0311-5544332',
        category: 'Packaging',
        address: 'Sundar Industrial Estate',
      },
      {
        name: 'City Chemical Store',
        contact: '0333-1122334',
        category: 'Preservatives & Food Colors',
        address: 'Brandreth Road, Lahore',
      },
    ]);

    // 5. Settings
    await Setting.create({
      companyName: 'Freshly Foods',
      tagline: 'Factory Manufacturing & Industrial Food Processing Unit',
      address: 'Plot 42-B, Industrial Estate, Lahore',
      phone: '0300-1234567',
      email: 'info@freshlyfoods.pk',
      ntn: 'NTN-1234567-8',
      strn: 'STRN-9876543',
      currency: 'PKR',
      invoicePrefix: 'INV',
      taxPercent: 0,
    });

    console.log('✅ Backend Database Seeded Successfully with Real MongoDB Data!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
};

seedDatabase();
