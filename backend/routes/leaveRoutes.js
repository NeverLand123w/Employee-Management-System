const express = require("express");
const Leave = require("../models/Leave");
const Employee = require("../models/Employee");
const Notification = require("../models/Notification");
const { protect, admin } = require("../middleware/authMiddleware");
const router = express.Router();

const TOTAL_LEAVE_ALLOWANCE = 20;

const calculateBusinessDays = (start, end, isHalfDay) => {
  if (isHalfDay) return 0.5;
  let count = 0;
  let curDate = new Date(start);
  const endDate = new Date(end);

  while (curDate <= endDate) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
};

router.post("/apply", protect, async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, isHalfDay } = req.body;
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newStart = new Date(startDate);
    newStart.setHours(0, 0, 0, 0);
    const newEnd = new Date(endDate);
    newEnd.setHours(23, 59, 59, 999);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (newStart > newEnd)
      return res.status(400).json({ message: "Invalid date range." });

    if (newStart < today && leaveType !== "Sick") {
      return res
        .status(400)
        .json({
          message:
            "Action Blocked: Only Sick Leave can be applied retroactively.",
        });
    }

    const overlappingLeave = await Leave.findOne({
      employeeId: req.user._id,
      status: { $in: ["Pending", "Approved", "Cancel Requested"] },
      startDate: { $lte: newEnd },
      endDate: { $gte: newStart },
    });

    if (overlappingLeave) {
      return res
        .status(400)
        .json({
          message: "Action Blocked: Overlaps with an existing leave request.",
        });
    }

    const existingLeaves = await Leave.find({
      employeeId: req.user._id,
      status: { $in: ["Pending", "Approved", "Cancel Requested"] },
    });

    let totalUsedDays = 0;
    existingLeaves.forEach((l) => {
      totalUsedDays += calculateBusinessDays(
        l.startDate,
        l.endDate,
        l.isHalfDay,
      );
    });

    const requestedDays = calculateBusinessDays(startDate, endDate, isHalfDay);

    if (requestedDays === 0) {
      return res
        .status(400)
        .json({
          message: "Invalid selection: Weekends do not require leave requests.",
        });
    }

    if (totalUsedDays + requestedDays > TOTAL_LEAVE_ALLOWANCE) {
      return res
        .status(403)
        .json({
          message: `Action Blocked: Insufficient balance. You are attempting to exceed your annual limit of ${TOTAL_LEAVE_ALLOWANCE} days.`,
        });
    }

    const newLeave = new Leave({
      employeeId: req.user._id,
      leaveType,
      startDate,
      endDate,
      reason,
      isHalfDay: isHalfDay || false,
    });
    await newLeave.save();

    const admins = await Employee.find({ role: "Admin" });
    const notifications = admins.map((adminUser) => ({
      recipientId: adminUser._id,
      message: `New ${isHalfDay ? "Half-Day " : ""}${leaveType} request from ${req.user.name}.`,
    }));
    if (notifications.length > 0) await Notification.insertMany(notifications);

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
    if (!["Approved", "Rejected", "Cancelled"].includes(status))
      return res.status(400).json({ message: "Invalid status parameter" });

    const leave = await Leave.findById(req.params.id);
    if (!leave)
      return res.status(404).json({ message: "Leave record not found" });

    const dateStr = new Date(leave.startDate).toLocaleDateString();
    let messageText = `Your leave request starting ${dateStr} was ${status}.`;

    if (status === "Cancelled" && leave.status === "Cancel Requested") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(leave.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(leave.endDate);
      end.setHours(23, 59, 59, 999);

      if (today > start && today <= end && !leave.isHalfDay) {
        const newEndDate = new Date(today);
        newEndDate.setDate(newEndDate.getDate() - 1);

        if (start.getTime() > newEndDate.getTime()) {
          leave.status = "Cancelled";
          messageText = `Cancellation approved and fully refunded.`;
        } else {
          leave.endDate = newEndDate;
          leave.status = "Approved";
          messageText = `Active leave shortened. Ends on ${newEndDate.toLocaleDateString()}. Unused future days refunded.`;
        }
      } else if (today > end) {
        return res
          .status(400)
          .json({ message: "Cannot cancel a fully completed leave." });
      } else {
        leave.status = "Cancelled";
        messageText = `Cancellation approved and days refunded.`;
      }
    } else if (status === "Approved" && req.body.wasCancelDeny) {
      leave.status = "Approved";
      messageText = `Request to cancel leave on ${dateStr} was denied.`;
    } else {
      leave.status = status;
    }

    await leave.save();
    await Notification.create({
      recipientId: leave.employeeId,
      message: messageText,
    });
    res.status(200).json(leave);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id/request-cancel", protect, async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave)
      return res.status(404).json({ message: "Leave record not found" });
    if (String(leave.employeeId) !== String(req.user._id))
      return res
        .status(403)
        .json({ message: "Action Blocked: Unauthorized access." });
    if (leave.status !== "Approved")
      return res
        .status(400)
        .json({
          message:
            "Action Blocked: Only approved leaves can be requested for cancellation.",
        });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(leave.endDate);
    end.setHours(23, 59, 59, 999);

    if (today > end)
      return res
        .status(400)
        .json({ message: "Action Blocked: Cannot cancel completed leave." });

    leave.status = "Cancel Requested";
    await leave.save();

    const dateStr = new Date(leave.startDate).toLocaleDateString();
    const admins = await Employee.find({ role: "Admin" });
    const notifications = admins.map((adminUser) => ({
      recipientId: adminUser._id,
      message: `${req.user.name} has requested to cancel their leave on ${dateStr}.`,
    }));
    if (notifications.length > 0) await Notification.insertMany(notifications);

    res.status(200).json(leave);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", protect, admin, async (req, res) => {
  try {
    const leaveToUpdate = await Leave.findById(req.params.id);
    if (!leaveToUpdate)
      return res.status(404).json({ message: "Leave record not found" });

    const { startDate, endDate, leaveType, reason, isHalfDay } = req.body;

    const newStart = new Date(startDate);
    newStart.setHours(0, 0, 0, 0);
    const newEnd = new Date(endDate);
    newEnd.setHours(23, 59, 59, 999);

    if (newStart > newEnd)
      return res.status(400).json({ message: "Invalid date range." });

    const overlappingLeave = await Leave.findOne({
      _id: { $ne: req.params.id },
      employeeId: leaveToUpdate.employeeId,
      status: { $in: ["Pending", "Approved", "Cancel Requested"] },
      startDate: { $lte: newEnd },
      endDate: { $gte: newStart },
    });

    if (overlappingLeave)
      return res
        .status(400)
        .json({
          message:
            "Action Blocked: Dates overlap with another existing record.",
        });

    leaveToUpdate.startDate = startDate;
    leaveToUpdate.endDate = endDate;
    leaveToUpdate.leaveType = leaveType;
    leaveToUpdate.reason = reason;
    leaveToUpdate.isHalfDay = isHalfDay || false;

    await leaveToUpdate.save();

    await Notification.create({
      recipientId: leaveToUpdate.employeeId,
      message: `Your leave record dates/details were manually modified by Administration.`,
    });

    res.status(200).json(leaveToUpdate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave)
      return res.status(404).json({ message: "Leave record not found" });

    if (req.user.role !== "Admin") {
      if (String(leave.employeeId) !== String(req.user._id))
        return res
          .status(403)
          .json({ message: "Action Blocked: No permission." });
      if (leave.status !== "Pending")
        return res
          .status(403)
          .json({
            message:
              "Action Blocked: Can only permanently delete Pending requests.",
          });
    }

    await Leave.findByIdAndDelete(req.params.id);
    const dateStr = new Date(leave.startDate).toLocaleDateString();

    if (req.user.role === "Admin") {
      await Notification.create({
        recipientId: leave.employeeId,
        message: `Your leave record starting ${dateStr} has been permanently removed by Admin.`,
      });
    } else {
      const admins = await Employee.find({ role: "Admin" });
      const notifications = admins.map((adminUser) => ({
        recipientId: adminUser._id,
        message: `${req.user.name} withdrew their pending leave on ${dateStr}.`,
      }));
      if (notifications.length > 0)
        await Notification.insertMany(notifications);
    }

    res.status(200).json({ message: "Leave record deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
