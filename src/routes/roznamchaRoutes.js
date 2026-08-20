const express = require('express');
const router = express.Router();
const RoznamchaEntry = require('../models/RoznamchaEntry');

// GET /api/roznamcha - Get list of Roznamcha dates or filter by date/month
router.get('/', async (req, res) => {
  try {
    const { date, month } = req.query;
    let query = {};
    if (date) {
      query.date = date;
      const single = await RoznamchaEntry.findOne({ date });
      return res.json(single || null);
    }
    if (month) {
      query.date = { $regex: `^${month}` };
    }

    const list = await RoznamchaEntry.find(query).sort({ date: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/roznamcha/carry-forward/:date - Find previous day's closing balance
router.get('/carry-forward/:date', async (req, res) => {
  try {
    const { date } = req.params;
    // Find the latest record with date < current date
    const prevRecord = await RoznamchaEntry.findOne({ date: { $lt: date } }).sort({ date: -1 });
    const openingBalance = prevRecord ? prevRecord.closingBalance : 0;
    res.json({
      previousDate: prevRecord ? prevRecord.date : null,
      openingBalance: openingBalance || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/roznamcha - Save or update daily Roznamcha sheet
router.post('/', async (req, res) => {
  try {
    const { date, openingBalance, incomeEntries, expenseEntries, note, recordedBy } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const openBal = Number(openingBalance) || 0;
    const cleanIncomes = Array.isArray(incomeEntries)
      ? incomeEntries
          .filter((i) => i.description && i.description.trim() && Number(i.amount) >= 0)
          .map((i) => ({
            description: i.description.trim(),
            pageNo: i.pageNo ? String(i.pageNo).trim() : '',
            amount: Number(i.amount) || 0,
            note: i.note ? String(i.note).trim() : '',
          }))
      : [];

    const cleanExpenses = Array.isArray(expenseEntries)
      ? expenseEntries
          .filter((e) => e.description && e.description.trim() && Number(e.amount) >= 0)
          .map((e) => ({
            description: e.description.trim(),
            pageNo: e.pageNo ? String(e.pageNo).trim() : '',
            amount: Number(e.amount) || 0,
            note: e.note ? String(e.note).trim() : '',
          }))
      : [];

    const totalIncome = openBal + cleanIncomes.reduce((s, i) => s + i.amount, 0);
    const totalExpense = cleanExpenses.reduce((s, e) => s + e.amount, 0);
    const closingBalance = totalIncome - totalExpense;

    let record = await RoznamchaEntry.findOne({ date });

    if (record) {
      record.openingBalance = openBal;
      record.incomeEntries = cleanIncomes;
      record.expenseEntries = cleanExpenses;
      record.totalIncome = totalIncome;
      record.totalExpense = totalExpense;
      record.closingBalance = closingBalance;
      record.note = note || '';
      record.recordedBy = recordedBy || 'Munshi / Cashier';
      await record.save();
    } else {
      record = new RoznamchaEntry({
        date,
        openingBalance: openBal,
        incomeEntries: cleanIncomes,
        expenseEntries: cleanExpenses,
        totalIncome,
        totalExpense,
        closingBalance,
        note: note || '',
        recordedBy: recordedBy || 'Munshi / Cashier',
      });
      await record.save();
    }

    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/roznamcha/:date - Delete a day's record
router.delete('/:date', async (req, res) => {
  try {
    const deleted = await RoznamchaEntry.findOneAndDelete({ date: req.params.date });
    if (!deleted) return res.status(404).json({ message: 'Roznamcha sheet not found' });
    res.json({ message: 'Roznamcha sheet deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
