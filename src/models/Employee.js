const mongoose = require('mongoose');

const loanRepaymentSchema = new mongoose.Schema(
  {
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['Salary Deduction', 'Direct Cash Payment'], default: 'Salary Deduction' },
    note: { type: String, default: '' },
    recordedBy: { type: String, default: 'Admin' },
  },
  { timestamps: true }
);

const loanSchema = new mongoose.Schema(
  {
    loanAmount: { type: Number, required: true },
    monthlyDeduction: { type: Number, required: true }, // e.g. 5000 / month
    issueDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    reason: { type: String, default: 'Personal Need' },
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, required: true },
    status: { type: String, enum: ['Active', 'Cleared'], default: 'Active' },
    repayments: [loanRepaymentSchema],
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: { type: String, required: true },
    phone: { type: String, default: '' },
    cnic: { type: String, default: '' },
    salary: { type: Number, default: 0 },
    department: { type: String, default: 'Production Floor' },
    address: { type: String, default: '' },
    emergencyPhone: { type: String, default: '' },
    joiningDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['Active', 'On Leave', 'Inactive'], default: 'Active' },
    totalLoan: { type: Number, default: 0 },
    remainingLoan: { type: Number, default: 0 },
    monthlyLoanDeduction: { type: Number, default: 0 },
    loans: [loanSchema],
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Employee', employeeSchema);
