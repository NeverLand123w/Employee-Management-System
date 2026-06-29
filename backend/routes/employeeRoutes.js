const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Employee = require("../models/Employee");
const { protect, admin } = require("../middleware/authMiddleware");
const { sendAccountSetupEmail } = require("../utils/emailService");
const router = express.Router();

router.put("/me/avatar", protect, async (req, res) => {
  try {
    const { image } = req.body;
    const employee = await Employee.findById(req.user._id);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    employee.profileImage = image;
    await employee.save();
    res.status(200).json({ profileImage: employee.profileImage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/me", protect, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user._id).select("-password");
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });
    res.status(200).json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/me/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Both current and new password are required." });

    if (newPassword.length < 6)
      return res.status(400).json({ message: "New password must be at least 6 characters." });

    const employee = await Employee.findById(req.user._id);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    const isMatch = await bcrypt.compare(currentPassword, employee.password);
    if (!isMatch)
      return res.status(400).json({ message: "Current password is incorrect." });

    const salt = await bcrypt.genSalt(10);
    employee.password = await bcrypt.hash(newPassword, salt);
    await employee.save();

    res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", protect, admin, async (req, res) => {
  try {
    const employees = await Employee.find().select("-password");
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", protect, admin, async (req, res) => {
  try {
    const { name, email, role, department } = req.body;

    if (!name || !email)
      return res.status(400).json({ message: "Name and email are required" });

    const existing = await Employee.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already in use" });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    const newEmployee = new Employee({
      name,
      email,
      role,
      department,
      accountSetupToken: hashedToken,
      accountSetupExpires: Date.now() + 24 * 60 * 60 * 1000,
    });
    const savedEmployee = await newEmployee.save();

    try {
      await sendAccountSetupEmail({ to: email, name, setupToken: rawToken });
    } catch (emailErr) {
      console.error("Setup email failed (non-fatal):", emailErr.message);
    }

    const employeeObj = savedEmployee.toObject();
    delete employeeObj.password;

    res.status(201).json(employeeObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", protect, admin, async (req, res) => {
  try {
    const targetEmployee = await Employee.findById(req.params.id);
    if (!targetEmployee)
      return res.status(404).json({ message: "Employee not found" });

    const { name, email, role, department, resetPassword } = req.body;

    if (!name || !email)
      return res.status(400).json({ message: "Name and email are required" });

    if (String(req.user._id) === req.params.id && role === "Employee") {
      return res.status(403).json({
        message: "Security Action Blocked: You cannot demote yourself from Admin status.",
      });
    }

    if (String(req.user._id) !== req.params.id && targetEmployee.role === "Admin") {
      return res.status(403).json({
        message: "Security Action Blocked: You do not have clearance to modify another Administrator's account.",
      });
    }

    let updateData = { name, email, role, department };

    // Check email isn't already used by a *different* document
    if (email !== targetEmployee.email) {
      const emailTaken = await Employee.findOne({ email, _id: { $ne: req.params.id } });
      if (emailTaken)
        return res.status(400).json({ message: "That email address is already in use by another account." });
    }

    if (resetPassword) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
      updateData.accountSetupToken = hashedToken;
      updateData.accountSetupExpires = Date.now() + 24 * 60 * 60 * 1000;
      updateData.password = null;

      try {
        await sendAccountSetupEmail({
          to: targetEmployee.email,
          name: targetEmployee.name,
          setupToken: rawToken,
        });
      } catch (emailErr) {
        console.error("Setup email failed (non-fatal):", emailErr.message);
      }
    }

    const updated = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    ).select("-password");
    res.status(200).json(updated);
  } catch (error) {
    if (error.code === 11000)
      return res.status(400).json({ message: "That email address is already in use by another account." });
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/resend-setup", protect, admin, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    if (employee.password)
      return res.status(400).json({ message: "Account is already active — setup is complete." });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    employee.accountSetupToken = hashedToken;
    employee.accountSetupExpires = Date.now() + 24 * 60 * 60 * 1000;
    await employee.save();

    try {
      await sendAccountSetupEmail({ to: employee.email, name: employee.name, setupToken: rawToken });
    } catch (emailErr) {
      console.error("Resend setup email failed:", emailErr.message);
      return res.status(500).json({ message: "Failed to send email. Check server email configuration." });
    }

    res.status(200).json({ message: "Setup link resent successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const targetEmployee = await Employee.findById(req.params.id);
    if (!targetEmployee)
      return res.status(404).json({ message: "Employee not found" });

    if (String(req.user._id) === req.params.id)
      return res.status(403).json({
        message: "Security Action Blocked: You cannot delete your own admin account.",
      });

    if (targetEmployee.role === "Admin")
      return res.status(403).json({
        message: "Security Action Blocked: You do not have clearance to delete another Administrator.",
      });

    await Employee.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
