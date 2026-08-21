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
            section: e.section || 'expenses', // 'khana', 'expenses', 'services', 'advance'
            description: e.description.trim(),
            pageNo: e.pageNo ? String(e.pageNo).trim() : '',
            amount: Number(e.amount) || 0,
            note: e.note ? String(e.note).trim() : '',
          }))
      : [];

    const totalIncomeRaw = cleanIncomes.reduce((s, i) => s + i.amount, 0);
    const totalIncome = openBal + totalIncomeRaw;
    const totalExpense = cleanExpenses.reduce((s, e) => s + e.amount, 0);
    const closingBalance = totalIncome - totalExpense;

    // Shortfall to be deducted from Owner Capital (only after Tafseel Aamdan + Opening Balance is exhausted)
    const expenseFromOwner = Math.max(0, totalExpense - totalIncome);

    let record = await RoznamchaEntry.findOne({ date });
    const ownerAmt = Number(req.body.ownerAmount) || 0;

    if (record) {
      record.openingBalance = openBal;
      record.incomeEntries = cleanIncomes;
      record.expenseEntries = cleanExpenses;
      record.totalIncome = totalIncome;
      record.totalExpense = totalExpense;
      record.closingBalance = closingBalance;
      record.ownerAmount = ownerAmt;
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
        ownerAmount: ownerAmt,
        note: note || '',
        recordedBy: recordedBy || 'Munshi / Cashier',
      });
      await record.save();
    }

    // Sync with Owner Capital if deductFromOwnerCapital is requested (Only deduct expenseFromOwner)
    if (req.body.deductFromOwnerCapital !== false) {
      try {
        const CapitalTransaction = require('../models/CapitalTransaction');
        const capCategory = `Roznamcha Kharcha (${date})`;
        if (expenseFromOwner > 0) {
          let capTx = await CapitalTransaction.findOne({ category: capCategory });
          if (capTx) {
            capTx.amount = expenseFromOwner;
            capTx.note = `Auto-synced from Roznamcha: Owner shortfall for ${date}`;
            await capTx.save();
          } else {
            await CapitalTransaction.create({
              type: 'CASH_OUT',
              amount: expenseFromOwner,
              date: date,
              category: capCategory,
              sourceOrDestination: 'Owner Pocket (Cash)',
              note: `Auto-synced from Roznamcha: Owner shortfall for ${date}`,
              recordedBy: recordedBy || 'Munshi / Cashier',
            });
          }
        } else {
          // No shortfall from owner — remove previous capital deduction if any
          await CapitalTransaction.deleteMany({ category: capCategory });
        }
      } catch (capErr) {
        console.warn('Could not sync roznamcha to Owner Capital:', capErr.message);
      }
    }

    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/roznamcha/:date - Delete a day's record
router.delete('/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const deleted = await RoznamchaEntry.findOneAndDelete({ date });

    // Also delete linked capital transaction if any
    try {
      const CapitalTransaction = require('../models/CapitalTransaction');
      await CapitalTransaction.deleteMany({ category: `Roznamcha Kharcha (${date})` });
    } catch (capErr) {
      console.warn('Could not remove linked CapitalTransaction:', capErr.message);
    }

    if (!deleted) return res.status(404).json({ message: 'Roznamcha sheet not found' });
    res.json({ message: 'Roznamcha sheet deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
