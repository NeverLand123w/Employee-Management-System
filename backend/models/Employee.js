const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Employee'], default: 'Employee' },
    department: { type: String, default: 'Unassigned' }
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);