const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: null },
    role: { type: String, enum: ["Admin", "Employee"], default: "Employee" },
    department: { type: String, default: "Unassigned" },
    profileImage: { type: String, default: "" },
    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    accountSetupToken: { type: String, default: null },
    accountSetupExpires: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Employee", employeeSchema);
