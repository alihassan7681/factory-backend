const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Order = require('../models/Order');

const findCustomer = async (id, body = {}) => {
  if (id && mongoose.Types.ObjectId.isValid(id)) {
    const cust = await Customer.findById(id);
    if (cust) return cust;
  }
  const nameToSearch = body.name || body.customerName;
  if (nameToSearch && typeof nameToSearch === 'string') {
    const cust = await Customer.findOne({
      name: { $regex: new RegExp(`^${nameToSearch.trim()}$`, 'i') },
    });
    if (cust) return cust;
  }
  if (id && typeof id === 'string' && !id.startsWith('c-')) {
    const cust = await Customer.findOne({
      name: { $regex: new RegExp(`^${id.trim()}$`, 'i') },
    });
    if (cust) return cust;
  }
  return null;
};

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

    const customer = await findCustomer(req.params.id, req.body);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // First, apply payment to remainingBalance
    const currentRemaining = Number(customer.remainingBalance) || 0;
    const currentAdvance = Number(customer.advanceBalance) || 0;

    let towardsBalance = Math.min(payAmt, currentRemaining);
    let leftover = payAmt - towardsBalance;

    customer.totalPaid = (Number(customer.totalPaid) || 0) + payAmt;
    customer.remainingBalance = Math.max(0, currentRemaining - towardsBalance);

    // If overpayment, add to advanceBalance
    if (leftover > 0) {
      customer.advanceBalance = currentAdvance + leftover;
    }

    await customer.save();

    // Distribute payment across customer's pending invoices
    let remainingToDistribute = towardsBalance;
    const pendingOrders = await Order.find({
      $or: [
        { customerId: customer._id },
        { customerName: { $regex: new RegExp(`^${customer.name.trim()}$`, 'i') } },
      ],
      remainingBalance: { $gt: 0 },
    }).sort({ createdAt: 1 });

    for (const ord of pendingOrders) {
      if (remainingToDistribute <= 0) break;
      const payForThis = Math.min(remainingToDistribute, ord.remainingBalance);
      ord.advancePaid = (Number(ord.advancePaid) || 0) + payForThis;
      ord.remainingBalance = Math.max(0, (Number(ord.remainingBalance) || 0) - payForThis);
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
      message: leftover > 0
        ? `Payment recorded. Rs. ${leftover} advance credit saved for customer.`
        : 'Payment recorded and ledger updated successfully',
      customer,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers/:id/add-advance - Manually add advance credit for a customer
router.post('/:id/add-advance', async (req, res) => {
  try {
    const { amount, note, name } = req.body;
    const advAmt = Number(amount);
    if (!advAmt || advAmt <= 0) {
      return res.status(400).json({ message: 'Valid advance amount is required' });
    }

    let customer = await findCustomer(req.params.id, req.body);
    if (!customer) {
      // Auto-create in MongoDB if customer was created offline/locally
      const custName = name || (req.params.id.startsWith('c-') ? 'Customer' : req.params.id);
      customer = new Customer({
        name: custName,
        totalPurchased: 0,
        totalPaid: advAmt,
        remainingBalance: 0,
        advanceBalance: advAmt,
      });
      await customer.save();
      return res.json({
        message: `Advance added. Rs. ${advAmt} credit saved.`,
        customer,
      });
    }

    const currentRemaining = Number(customer.remainingBalance) || 0;
    const currentAdvance = Number(customer.advanceBalance) || 0;

    // First apply advance towards any remaining balance
    let towardsBalance = Math.min(advAmt, currentRemaining);
    let leftover = advAmt - towardsBalance;

    customer.totalPaid = (Number(customer.totalPaid) || 0) + advAmt;
    customer.remainingBalance = Math.max(0, currentRemaining - towardsBalance);
    customer.advanceBalance = currentAdvance + leftover;

    await customer.save();

    res.json({
      message: leftover > 0
        ? `Advance added. Rs. ${leftover} credit saved.`
        : `Rs. ${advAmt} applied to outstanding balance.`,
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
      const totalPaidFromOrders = customerOrders.reduce((sum, o) => sum + (Number(o.advancePaid) || 0), 0);

      // Preserve advanceBalance — only recalculate remainingBalance from orders
      const currentAdvance = Number(customer.advanceBalance) || 0;
      const rawRemaining = totalPurchased - totalPaidFromOrders;
      // If advance covers the remaining, remaining = 0 and advance absorbs the rest
      const remainingBalance = Math.max(0, rawRemaining - currentAdvance);

      if (
        customer.totalPurchased !== totalPurchased ||
        customer.remainingBalance !== remainingBalance
      ) {
        customer.totalPurchased = totalPurchased;
        customer.totalPaid = totalPaidFromOrders + currentAdvance;
        customer.remainingBalance = remainingBalance;
        // advanceBalance is NOT touched — preserved as-is
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

// PUT /api/customers/:id - Update customer details (ability, name, contact, address)
router.put('/:id', async (req, res) => {
  try {
    const { name, contact, address, ability } = req.body;
    let customer = await findCustomer(req.params.id, req.body);
    if (!customer) {
      if (name) {
        customer = new Customer({
          name: name.trim(),
          contact: contact || '',
          address: address || '',
          ability: Number(ability) || 0,
        });
        await customer.save();
        return res.json(customer);
      }
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (name !== undefined) customer.name = name;
    if (contact !== undefined) customer.contact = contact;
    if (address !== undefined) customer.address = address;
    if (ability !== undefined) customer.ability = Number(ability) || 0;

    await customer.save();
    res.json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/customers/:id - Delete a customer account
router.delete('/:id', async (req, res) => {
  try {
    const customer = await findCustomer(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    await Customer.findByIdAndDelete(customer._id);
    res.json({ message: 'Customer account deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
