const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Half Day', 'Leave'],
      default: 'Present',
    },
    note: {
      type: String,
      default: '',
    },
    markedBy: {
      type: String,
      default: 'Admin / Supervisor',
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ date: 1, employeeId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
