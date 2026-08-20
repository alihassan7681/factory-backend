const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

// GET /api/reports/summary - Get aggregated dashboard metrics
router.get('/summary', async (req, res) => {
  try {
    const orders = await Order.find();
    const products = await Product.find();
    const customers = await Customer.find();

    const now = new Date();
    const isToday = (d) => {
      const date = new Date(d);
      return (
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    };

    const todayOrders = orders.filter((o) => isToday(o.orderDate || o.createdAt));
    const todayBilled = todayOrders.reduce((s, o) => s + o.totalAmount, 0);
    const todayCashReceived = todayOrders
      .filter((o) => o.remainingBalance === 0)
      .reduce((s, o) => s + o.totalAmount, 0);

    const totalClearedCash = orders
      .filter((o) => o.remainingBalance === 0)
      .reduce((s, o) => s + o.totalAmount, 0);

    const totalMarketUdhaar = customers.reduce((s, c) => s + c.remainingBalance, 0);
    const totalStockValuation = products.reduce((s, p) => s + p.currentStock * p.price, 0);
    const totalStockUnits = products.reduce((s, p) => s + p.currentStock, 0);

    res.json({
      todayBilled,
      todayCashReceived,
      todayPendingUdhaar: todayBilled - todayCashReceived,
      totalClearedCash,
      totalMarketUdhaar,
      totalStockValuation,
      totalStockUnits,
      totalOrdersCount: orders.length,
      totalCustomersCount: customers.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
