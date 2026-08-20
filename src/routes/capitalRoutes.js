const express = require('express');
const router = express.Router();
const CapitalTransaction = require('../models/CapitalTransaction');

// GET /api/capital - Get all capital transactions and summary totals
router.get('/', async (req, res) => {
  try {
    const transactions = await CapitalTransaction.find().sort({ date: -1, createdAt: -1 });

    const totalCashIn = transactions
      .filter((t) => t.type === 'CASH_IN')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const totalCashOut = transactions
      .filter((t) => t.type === 'CASH_OUT')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const netBalance = totalCashIn - totalCashOut;

    res.json({
      transactions,
      summary: {
        totalCashIn,
        totalCashOut,
        netBalance,
        totalTransactions: transactions.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/capital - Add a new Cash In or Cash Out transaction
router.post('/', async (req, res) => {
  try {
    const { type, amount, date, category, sourceOrDestination, note, recordedBy } = req.body;
    const numAmt = Number(amount);
    if (!numAmt || numAmt <= 0) {
      return res.status(400).json({ message: 'Valid positive amount is required' });
    }
    if (!type || !['CASH_IN', 'CASH_OUT'].includes(type)) {
      return res.status(400).json({ message: 'Type must be CASH_IN or CASH_OUT' });
    }

    const transaction = new CapitalTransaction({
      type,
      amount: numAmt,
      date: date || new Date().toISOString().split('T')[0],
      category: category || (type === 'CASH_IN' ? 'Factory Expense Support' : 'Owner Drawing'),
      sourceOrDestination: sourceOrDestination || (type === 'CASH_IN' ? 'Owner Pocket (Cash)' : 'Cash in Hand'),
      note: note || '',
      recordedBy: recordedBy || 'Owner / Factory Admin',
    });

    await transaction.save();
    res.status(201).json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/capital/:id - Delete a transaction
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await CapitalTransaction.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ message: 'Transaction removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
