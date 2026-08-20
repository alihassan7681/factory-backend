const express = require('express');
const router = express.Router();
const QarzEntry = require('../models/QarzEntry');

// GET /api/qarz - Get all entries with optional filters
router.get('/', async (req, res) => {
  try {
    const { type, status } = req.query;
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const entries = await QarzEntry.find(query).sort({ date: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/qarz/:id - Get single entry
router.get('/:id', async (req, res) => {
  try {
    const entry = await QarzEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/qarz - Add new Qarz entry
router.post('/', async (req, res) => {
  try {
    const { type, personName, amount, date, dueDate, description } = req.body;

    if (!type || !personName || !amount || !date) {
      return res.status(400).json({ message: 'type, personName, amount, date are required' });
    }

    const entry = new QarzEntry({
      type,
      personName: personName.trim(),
      amount: Number(amount),
      date,
      dueDate: dueDate || '',
      description: description ? description.trim() : '',
      paidBack: 0,
      status: 'pending',
      payments: [],
    });

    await entry.save();
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/qarz/:id/payment - Record a payment (partial or full)
router.put('/:id/payment', async (req, res) => {
  try {
    const { paymentAmount, paymentDate, paymentNote } = req.body;
    const entry = await QarzEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ message: 'Valid payment amount required' });
    }

    entry.paidBack = Math.min(entry.paidBack + amt, entry.amount);
    entry.payments.push({
      amount: amt,
      date: paymentDate || new Date().toISOString().split('T')[0],
      note: paymentNote || '',
    });

    await entry.save(); // pre-save hook will update status
    res.json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/qarz/:id - Edit entry details
router.put('/:id', async (req, res) => {
  try {
    const { personName, amount, date, dueDate, description } = req.body;
    const entry = await QarzEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    if (personName) entry.personName = personName.trim();
    if (amount) entry.amount = Number(amount);
    if (date) entry.date = date;
    if (dueDate !== undefined) entry.dueDate = dueDate;
    if (description !== undefined) entry.description = description.trim();

    await entry.save();
    res.json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/qarz/:id - Delete entry
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await QarzEntry.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Qarz entry deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
