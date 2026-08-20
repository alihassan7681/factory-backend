const express = require('express');
const router = express.Router();
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');

// GET /api/payroll - Get payroll records
router.get('/', async (req, res) => {
  try {
    const { month } = req.query;
    const query = month ? { month } : {};
    const records = await Payroll.find(query).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payroll/advance - Record an Advance Payment (does NOT mark full salary as paid)
router.post('/advance', async (req, res) => {
  try {
    const { employeeId, month, amount, note, date } = req.body;
    const advAmt = Number(amount);
    if (!advAmt || advAmt <= 0) {
      return res.status(400).json({ message: 'Valid advance amount is required' });
    }

    let emp = null;
    if (employeeId && String(employeeId).length === 24) {
      emp = await Employee.findById(employeeId);
    }

    const empName = emp ? emp.name : (req.body.employeeName || 'Staff');
    const empRole = emp ? emp.role : (req.body.role || 'Staff');
    const baseSalary = emp ? Number(emp.salary) : (Number(req.body.baseSalary) || 0);

    // Check if a payroll record already exists for this employee and month
    let record = await Payroll.findOne({ employeeId, month });

    const newAdvanceEntry = {
      amount: advAmt,
      date: date || new Date().toISOString().split('T')[0],
      note: note || 'Mid-month Advance',
    };

    if (record) {
      record.advance = (record.advance || 0) + advAmt;
      record.advanceHistory.push(newAdvanceEntry);
      record.netSalary = Math.max(0, record.baseSalary + (record.bonus || 0) - record.advance - (record.deduction || 0));
      if (record.status !== 'Paid') {
        record.status = 'Advance';
      }
      await record.save();
    } else {
      record = new Payroll({
        employeeId,
        employeeName: empName,
        role: empRole,
        month,
        baseSalary,
        advance: advAmt,
        advanceHistory: [newAdvanceEntry],
        deduction: 0,
        bonus: 0,
        netSalary: Math.max(0, baseSalary - advAmt),
        note: note || 'Advance Payment',
        status: 'Advance',
      });
      await record.save();
    }

    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/payroll - Final Salary Payment / Settlement
router.post('/', async (req, res) => {
  try {
    const { employeeId, month, bonus, bonusReason, advance, deduction, deductionReason, note, paidDate } = req.body;
    let emp = null;
    if (employeeId && String(employeeId).length === 24) {
      emp = await Employee.findById(employeeId);
    }

    const empName = emp ? emp.name : (req.body.employeeName || 'Staff');
    const empRole = emp ? emp.role : (req.body.role || 'Staff');
    const baseSalary = emp ? Number(emp.salary) : (Number(req.body.baseSalary) || 0);

    const bonusAmt = Number(bonus) || 0;
    const advanceAmt = Number(advance) || 0;
    const deductionAmt = Number(deduction) || 0;
    const netSalary = Math.max(0, baseSalary + bonusAmt - advanceAmt - deductionAmt);

    let record = await Payroll.findOne({ employeeId, month });

    if (record) {
      record.bonus = bonusAmt;
      record.bonusReason = bonusReason || '';
      record.advance = advanceAmt;
      record.deduction = deductionAmt;
      record.deductionReason = deductionReason || '';
      record.netSalary = netSalary;
      record.note = note || 'Monthly Salary Settlement';
      record.paidDate = paidDate || new Date().toISOString().split('T')[0];
      record.status = 'Paid';
      await record.save();
    } else {
      record = new Payroll({
        employeeId,
        employeeName: empName,
        role: empRole,
        month,
        baseSalary,
        bonus: bonusAmt,
        bonusReason: bonusReason || '',
        advance: advanceAmt,
        deduction: deductionAmt,
        deductionReason: deductionReason || '',
        netSalary,
        note: note || 'Monthly Salary',
        paidDate: paidDate || new Date().toISOString().split('T')[0],
        status: 'Paid',
      });
      await record.save();
    }

    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/payroll/:id - Remove record
router.delete('/:id', async (req, res) => {
  try {
    await Payroll.findByIdAndDelete(req.params.id);
    res.json({ message: 'Payroll record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
