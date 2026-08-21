const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');

// GET /api/suppliers - Get all suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/suppliers/:id - Get single supplier by ID
router.get('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/suppliers - Create supplier
router.post('/', async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json(supplier);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/suppliers/:id - Delete supplier
router.delete('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json({ message: 'Supplier deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/suppliers/:id/transaction - Record Purchase or Payment for Supplier
router.post('/:id/transaction', async (req, res) => {
  try {
    const { type, amount, billNo, note, date } = req.body;
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });

    const txDate = date || new Date().toISOString().split('T')[0];

    supplier.transactions.push({
      date: txDate,
      type,
      amount: numAmount,
      billNo: billNo || '',
      note: note || '',
    });

    if (type === 'PURCHASE') {
      supplier.totalPurchased = (supplier.totalPurchased || 0) + numAmount;
      supplier.remainingBalance = (supplier.remainingBalance || 0) + numAmount;
    } else if (type === 'PAYMENT') {
      supplier.totalPaid = (supplier.totalPaid || 0) + numAmount;
      supplier.remainingBalance = Math.max(0, (supplier.remainingBalance || 0) - numAmount);
    }

    await supplier.save();
    res.json(supplier);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
