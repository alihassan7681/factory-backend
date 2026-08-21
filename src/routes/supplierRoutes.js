const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');

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

// POST /api/suppliers/:id/transaction - Record Purchase Bill (with Itemized Stock) or Payment
router.post('/:id/transaction', async (req, res) => {
  try {
    const { type, amount, billNo, note, date, items, paymentMethod, updateInventory } = req.body;
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });

    const txDate = date || new Date().toISOString().split('T')[0];

    const cleanItems = Array.isArray(items)
      ? items
          .filter((i) => i.itemName && i.itemName.trim() && Number(i.qty) > 0)
          .map((i) => ({
            itemName: i.itemName.trim(),
            qty: Number(i.qty) || 0,
            unit: i.unit || 'Kg',
            rate: Number(i.rate) || 0,
            subtotal: Number(i.subtotal) || (Number(i.qty) * Number(i.rate)) || 0,
          }))
      : [];

    supplier.transactions.push({
      date: txDate,
      type,
      amount: numAmount,
      billNo: billNo || '',
      note: note || '',
      items: cleanItems,
      paymentMethod: paymentMethod || 'Cash',
    });

    if (type === 'PURCHASE') {
      supplier.totalPurchased = (supplier.totalPurchased || 0) + numAmount;
      supplier.remainingBalance = (supplier.remainingBalance || 0) + numAmount;

      // Optionally increase inventory stock for purchased items
      if (updateInventory !== false && cleanItems.length > 0) {
        for (const item of cleanItems) {
          try {
            // Find matching product by name (case-insensitive)
            const prod = await Product.findOne({ name: { $regex: new RegExp(`^${item.itemName}$`, 'i') } });
            if (prod) {
              prod.currentStock = (prod.currentStock || 0) + item.qty;
              if (item.rate > 0) prod.costPrice = item.rate; // Update cost price
              await prod.save();
            }
          } catch (e) {
            console.warn('Inventory auto-update warning:', e.message);
          }
        }
      }
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
