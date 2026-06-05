const express = require("express");
const bcrypt = require("bcryptjs");
const Employee = require("../models/Employee");
const { protect, admin } = require("../middleware/authMiddleware");
const router = express.Router();

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
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    const existing = await Employee.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already in use" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newEmployee = new Employee({
      name,
      email,
      password: hashedPassword,
      role,
      department,
    });
    const savedEmployee = await newEmployee.save();

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

    const { name, email, role, department, password } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    if (req.user._id.toString() === req.params.id && role === "Employee") {
      return res
        .status(403)
        .json({
          message:
            "Security Action Blocked: You cannot demote yourself from Admin status.",
        });
    }

    if (
      req.user._id.toString() !== req.params.id &&
      targetEmployee.role === "Admin"
    ) {
      return res
        .status(403)
        .json({
          message:
            "Security Action Blocked: You do not have clearance to modify another Administrator's account.",
        });
    }

    let updateData = { name, email, role, department };

    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updated = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    ).select("-password");
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const targetEmployee = await Employee.findById(req.params.id);
    if (!targetEmployee)
      return res.status(404).json({ message: "Employee not found" });

    if (req.user._id.toString() === req.params.id) {
      return res
        .status(403)
        .json({
          message:
            "Security Action Blocked: You cannot delete your own admin account.",
        });
    }

    if (targetEmployee.role === "Admin") {
      return res
        .status(403)
        .json({
          message:
            "Security Action Blocked: You do not have clearance to delete another Administrator.",
        });
    }

    await Employee.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
