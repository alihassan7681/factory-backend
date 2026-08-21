const express = require('express');
const router = express.Router();
const MaintenanceDamage = require('../models/MaintenanceDamage');

// GET /api/maintenance - Get all maintenance & damage records
router.get('/', async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const records = await MaintenanceDamage.find(query).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/maintenance - Create a new record
router.post('/', async (req, res) => {
  try {
    const { itemName, type, cost, date, description, reportedBy, status } = req.body;

    if (!itemName || !type || !date) {
      return res.status(400).json({ message: 'itemName, type, date are required' });
    }

    const record = new MaintenanceDamage({
      itemName: itemName.trim(),
      type,
      cost: Number(cost) || 0,
      date,
      description: description ? description.trim() : '',
      reportedBy: reportedBy ? reportedBy.trim() : 'Staff',
      status: status || 'pending',
    });

    await record.save();
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/maintenance/:id - Update details or status
router.put('/:id', async (req, res) => {
  try {
    const { itemName, type, cost, date, description, reportedBy, status } = req.body;
    const record = await MaintenanceDamage.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    if (itemName !== undefined) record.itemName = itemName.trim();
    if (type !== undefined) record.type = type;
    if (cost !== undefined) record.cost = Number(cost) || 0;
    if (date !== undefined) record.date = date;
    if (description !== undefined) record.description = description.trim();
    if (reportedBy !== undefined) record.reportedBy = reportedBy.trim();
    if (status !== undefined) record.status = status;

    await record.save();
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/maintenance/:id/status - Quick toggle status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const record = await MaintenanceDamage.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    if (status) {
      record.status = status;
      await record.save();
    }
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/maintenance/:id - Delete a record
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await MaintenanceDamage.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Maintenance record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
