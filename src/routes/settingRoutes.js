const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');

// GET /api/settings - Get settings
router.get('/', async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST / PUT /api/settings - Update settings
router.post('/', async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/settings/clear-data - Clear specific collection from MongoDB
router.post('/clear-data', async (req, res) => {
  try {
    const { target } = req.body;
    const Order = require('../models/Order');
    const Customer = require('../models/Customer');
    const Product = require('../models/Product');
    const ProductionLog = require('../models/ProductionLog');
    const Payroll = require('../models/Payroll');
    const Employee = require('../models/Employee');

    if (target === 'factory_orders' || target === 'orders') {
      await Order.deleteMany({});
      return res.json({ message: 'All Sales Orders cleared from database.' });
    }
    if (target === 'factory_customers' || target === 'customers') {
      await Customer.deleteMany({});
      return res.json({ message: 'All Customers cleared from database.' });
    }
    if (target === 'factory_products' || target === 'products') {
      await Product.deleteMany({});
      return res.json({ message: 'All Products cleared from database.' });
    }
    if (target === 'factory_production_logs' || target === 'production') {
      await ProductionLog.deleteMany({});
      return res.json({ message: 'All Production Logs cleared from database.' });
    }
    if (target === 'factory_payroll' || target === 'payroll') {
      await Payroll.deleteMany({});
      return res.json({ message: 'All Payroll and Advance records cleared from database.' });
    }
    if (target === 'factory_employees' || target === 'employees') {
      await Employee.deleteMany({});
      return res.json({ message: 'All Employees cleared from database.' });
    }
    if (target === 'all') {
      await Promise.all([
        Order.deleteMany({}),
        Customer.deleteMany({}),
        Product.deleteMany({}),
        ProductionLog.deleteMany({}),
        Payroll.deleteMany({}),
        Employee.deleteMany({}),
      ]);
      return res.json({ message: 'All data cleared from database.' });
    }
    res.status(400).json({ message: 'Invalid clear target' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
