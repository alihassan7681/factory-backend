const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Payroll = require('../models/Payroll');
const Attendance = require('../models/Attendance');

// GET /api/employees - Get all employees
router.get('/', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/employees/:id - Get full employee account details, loans, payroll & attendance
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Fetch payroll records for this employee
    const empIdStr = String(employee._id);
    const payrolls = await Payroll.find({
      $or: [{ employeeId: empIdStr }, { employeeName: employee.name }],
    }).sort({ createdAt: -1 });

    // Fetch attendance records for this employee
    const attendances = await Attendance.find({
      $or: [{ employeeId: employee._id }, { employeeName: employee.name }],
    }).sort({ date: -1 });

    res.json({
      employee,
      payrolls,
      attendances,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/employees - Register employee
router.post('/', async (req, res) => {
  try {
    const employee = new Employee(req.body);
    await employee.save();
    res.status(201).json(employee);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/employees/:id - Update employee profile
router.put('/:id', async (req, res) => {
  try {
    const updated = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Employee not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/employees/:id/loans - Issue a new Loan to Employee
router.post('/:id/loans', async (req, res) => {
  try {
    const { loanAmount, monthlyDeduction, issueDate, reason, note } = req.body;
    const amt = Number(loanAmount);
    const deduction = Number(monthlyDeduction) || 0;

    if (!amt || amt <= 0) {
      return res.status(400).json({ message: 'Valid loan amount is required' });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const newLoan = {
      loanAmount: amt,
      monthlyDeduction: deduction,
      issueDate: issueDate || new Date().toISOString().split('T')[0],
      reason: reason || 'Personal Need / Emergency',
      paidAmount: 0,
      remainingAmount: amt,
      status: 'Active',
      repayments: [],
      note: note || '',
    };

    employee.loans.push(newLoan);
    employee.totalLoan = (employee.totalLoan || 0) + amt;
    employee.remainingLoan = (employee.remainingLoan || 0) + amt;
    employee.monthlyLoanDeduction = deduction;

    await employee.save();
    res.status(201).json({ message: 'Loan issued successfully', employee, loan: newLoan });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/employees/:id/loan-payments - Record manual or salary loan repayment
router.post('/:id/loan-payments', async (req, res) => {
  try {
    const { amount, date, type, note } = req.body;
    const amt = Number(amount);

    if (!amt || amt <= 0) {
      return res.status(400).json({ message: 'Valid payment amount is required' });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Distribute repayment across active loans
    let remainingToPay = amt;
    for (let loan of employee.loans) {
      if (loan.status === 'Active' && loan.remainingAmount > 0 && remainingToPay > 0) {
        const payForThisLoan = Math.min(remainingToPay, loan.remainingAmount);
        loan.paidAmount += payForThisLoan;
        loan.remainingAmount -= payForThisLoan;
        if (loan.remainingAmount <= 0) {
          loan.status = 'Cleared';
        }
        loan.repayments.push({
          date: date || new Date().toISOString().split('T')[0],
          amount: payForThisLoan,
          type: type || 'Direct Cash Payment',
          note: note || 'Loan Installment Repayment',
          recordedBy: 'Admin / Cashier',
        });
        remainingToPay -= payForThisLoan;
      }
    }

    // Recalculate employee total remaining loan
    employee.remainingLoan = employee.loans.reduce(
      (sum, l) => sum + (l.status === 'Active' ? l.remainingAmount : 0),
      0
    );

    // If all loans cleared, reset monthly deduction
    if (employee.remainingLoan <= 0) {
      employee.monthlyLoanDeduction = 0;
    }

    await employee.save();
    res.json({ message: 'Loan payment recorded successfully', employee });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/employees/:id - Delete employee
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Employee.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Employee not found' });
    res.json({ message: 'Employee removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
