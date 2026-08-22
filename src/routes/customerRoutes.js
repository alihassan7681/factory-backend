const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Order = require('../models/Order');

// GET /api/customers - Get all customers
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ remainingBalance: -1, createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers - Create new customer
router.post('/', async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/customers/:id/payment - Record khata settlement payment
router.post('/:id/payment', async (req, res) => {
  try {
    const { amount, note } = req.body;
    const payAmt = Number(amount);
    if (!payAmt || payAmt <= 0) {
      return res.status(400).json({ message: 'Valid payment amount is required' });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Update Customer Khata balance
    customer.totalPaid += payAmt;
    customer.remainingBalance = Math.max(0, customer.remainingBalance - payAmt);
    await customer.save();

    // Distribute payment across customer's pending invoices
    let remainingToDistribute = payAmt;
    const pendingOrders = await Order.find({
      customerId: customer._id,
      remainingBalance: { $gt: 0 },
    }).sort({ createdAt: 1 });

    for (const ord of pendingOrders) {
      if (remainingToDistribute <= 0) break;
      const payForThis = Math.min(remainingToDistribute, ord.remainingBalance);
      ord.advancePaid += payForThis;
      ord.remainingBalance -= payForThis;
      if (ord.remainingBalance === 0) {
        ord.status = 'Paid';
      } else {
        ord.status = 'Partial';
      }
      ord.paymentHistory.push({
        amount: payForThis,
        date: new Date(),
        note: note || 'Khata Settlement',
      });
      await ord.save();
      remainingToDistribute -= payForThis;
    }

    res.json({
      message: 'Payment recorded and ledger updated successfully',
      customer,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers/recalculate - Recalculate all customer balances from orders
router.post('/recalculate', async (req, res) => {
  try {
    const customers = await Customer.find();
    let updatedCount = 0;

    for (const customer of customers) {
      const customerOrders = await Order.find({
        $or: [
          { customerId: customer._id.toString() },
          { customerName: { $regex: new RegExp(`^${customer.name.trim()}$`, 'i') } },
        ],
      });

      const totalPurchased = customerOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      const totalPaid = customerOrders.reduce((sum, o) => sum + (Number(o.advancePaid) || 0), 0);
      const remainingBalance = Math.max(0, totalPurchased - totalPaid);

      if (
        customer.totalPurchased !== totalPurchased ||
        customer.totalPaid !== totalPaid ||
        customer.remainingBalance !== remainingBalance
      ) {
        customer.totalPurchased = totalPurchased;
        customer.totalPaid = totalPaid;
        customer.remainingBalance = remainingBalance;
        await customer.save();
        updatedCount++;
      }
    }

    const updatedCustomers = await Customer.find().sort({ remainingBalance: -1, createdAt: -1 });
    res.json({ message: `Recalculated ${updatedCount} customer balances`, customers: updatedCustomers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customers/:id - Delete a customer account
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Customer.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer account deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
