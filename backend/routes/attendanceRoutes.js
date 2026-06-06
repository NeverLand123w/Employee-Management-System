const express = require("express");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const { protect, admin } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/mark", protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const overlappingLeave = await Leave.findOne({
      employeeId: req.user._id,
      status: "Approved",
      isHalfDay: false,
      startDate: { $lte: endOfDay },
      endDate: { $gte: today },
    });

    if (overlappingLeave) {
      return res
        .status(403)
        .json({
          message:
            "Action Blocked: You are currently scheduled on a Full-Day Approved Leave. Contact Administration to revoke the leave before you can clock in.",
        });
    }

    let attendance = await Attendance.findOne({
      employeeId: req.user._id,
      date: { $gte: today, $lt: endOfDay },
    });

    if (attendance) {
      if (attendance.checkOutTime) {
        return res
          .status(400)
          .json({ message: "You have already checked out for today." });
      }
      attendance.checkOutTime = new Date().toISOString();
      await attendance.save();
      return res.status(200).json(attendance);
    } else {
      attendance = new Attendance({
        employeeId: req.user._id,
        date: new Date(),
        status: "Present",
        checkInTime: new Date().toISOString(),
      });
      await attendance.save();
      return res.status(201).json(attendance);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/me", protect, async (req, res) => {
  try {
    const records = await Attendance.find({ employeeId: req.user._id })
      .sort({ date: -1 })
      .limit(90);
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", protect, admin, async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 25 } = req.query;
    let query = {};

    if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: new Date(startDate), $lte: end };
    }

    const skip = (page - 1) * limit;

    const records = await Attendance.find(query)
      .populate("employeeId", "name email department")
      .sort({ date: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await Attendance.countDocuments(query);

    res.status(200).json({
      records,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
