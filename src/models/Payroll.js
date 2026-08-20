const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    role: { type: String },
    month: { type: String, required: true },
    baseSalary: { type: Number, required: true },
    advance: { type: Number, default: 0 },
    advanceHistory: [
      {
        amount: { type: Number, required: true },
        date: { type: String, default: () => new Date().toISOString().split('T')[0] },
        note: { type: String, default: 'Advance Payment' },
      },
    ],
    deduction: { type: Number, default: 0 },
    deductionReason: { type: String, default: '' },
    bonus: { type: Number, default: 0 },
    bonusReason: { type: String, default: '' },
    netSalary: { type: Number, required: true },
    note: { type: String, default: 'Monthly Salary' },
    paidDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    status: { type: String, enum: ['Paid', 'Advance', 'Unpaid'], default: 'Unpaid' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payroll', payrollSchema);
