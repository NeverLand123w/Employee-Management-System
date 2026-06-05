const express = require("express");
const Leave = require("../models/Leave");
const Employee = require("../models/Employee");
const Notification = require("../models/Notification");
const { protect, admin } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/apply", protect, async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newLeave = new Leave({
      employeeId: req.user._id,
      leaveType,
      startDate,
      endDate,
      reason,
    });
    await newLeave.save();

    const admins = await Employee.find({ role: "Admin" });
    const notifications = admins.map((adminUser) => ({
      recipientId: adminUser._id,
      message: `New ${leaveType} leave request from ${req.user.name}.`,
    }));
    await Notification.insertMany(notifications);

    res.status(201).json(newLeave);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/me", protect, async (req, res) => {
  try {
    const leaves = await Leave.find({ employeeId: req.user._id }).sort({
      createdAt: -1,
    });
    res.status(200).json(leaves);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", protect, admin, async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate("employeeId", "name email department")
      .sort({ createdAt: -1 });
    res.status(200).json(leaves);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id/status", protect, admin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status parameter" });
    }

    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );
    if (!leave)
      return res.status(404).json({ message: "Leave record not found" });

    const dateStr = new Date(leave.startDate).toLocaleDateString();
    await Notification.create({
      recipientId: leave.employeeId,
      message: `Your leave request starting ${dateStr} was ${status}.`,
    });

    res.status(200).json(leave);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
