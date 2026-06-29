const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const Employee = require("../models/Employee");
const { sendPasswordResetEmail } = require("../utils/emailService");
const router = express.Router();


const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
});

const passwordEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});


router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await Employee.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.password) {
      return res.status(403).json({ message: "Account setup incomplete. Please check your email for the setup link." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/setup-account/:token", async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters." });

    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await Employee.findOne({
      accountSetupToken: hashedToken,
      accountSetupExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Setup link is invalid or has expired." });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.accountSetupToken = null;
    user.accountSetupExpires = null;
    await user.save();

    res.status(200).json({ message: "Password set successfully. You can now log in." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/forgot-password", passwordEmailLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ message: "Email is required" });

    const user = await Employee.findOne({ email });
    if (!user)
      return res.status(200).json({ message: "If that email exists, a reset link has been sent." });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
    await user.save();

    await sendPasswordResetEmail({ to: user.email, name: user.name, resetToken: rawToken });

    res.status(200).json({ message: "If that email exists, a reset link has been sent." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/reset-password/:token", passwordEmailLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters." });

    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await Employee.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Reset link is invalid or has expired." });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.status(200).json({ message: "Password updated successfully. You can now log in." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
