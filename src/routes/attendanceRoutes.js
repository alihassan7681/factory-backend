const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');

// GET /api/attendance - Get attendance by date or month
router.get('/', async (req, res) => {
  try {
    const { date, month } = req.query;
    let query = {};
    if (date) {
      query.date = date;
    } else if (month) {
      query.date = { $regex: `^${month}` };
    }
    const records = await Attendance.find(query).sort({ date: -1, employeeName: 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance - Bulk save or update attendance for date
router.post('/', async (req, res) => {
  try {
    const { date, records } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    if (!Array.isArray(records)) {
      return res.status(400).json({ message: 'Records array is required' });
    }

    const bulkOps = records
      .filter((r) => r.employeeId)
      .map((r) => ({
        updateOne: {
          filter: { date: date, employeeId: r.employeeId },
          update: {
            $set: {
              date: date,
              employeeId: r.employeeId,
              employeeName: r.employeeName || 'Staff Member',
              role: r.role || '',
              status: r.status || 'Present',
              note: r.note || '',
              markedBy: r.markedBy || 'Supervisor',
            },
          },
          upsert: true,
        },
      }));

    if (bulkOps.length > 0) {
      await Attendance.bulkWrite(bulkOps);
    }

    const saved = await Attendance.find({ date });
    res.json({ message: 'Attendance saved successfully', count: saved.length, data: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/attendance/:date - Clear a date's attendance
router.delete('/:date', async (req, res) => {
  try {
    await Attendance.deleteMany({ date: req.params.date });
    res.json({ message: 'Attendance records deleted for date' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
