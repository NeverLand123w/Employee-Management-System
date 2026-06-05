const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['Present', 'Absent', 'Half-Day', 'On Leave'], required: true },
    checkInTime: { type: String },
    checkOutTime: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);