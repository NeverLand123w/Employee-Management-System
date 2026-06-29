const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendAccountSetupEmail({ to, name, setupToken }) {
  const setupURL = `${process.env.CLIENT_URL || "http://localhost:5173"}/setup-account/${setupToken}`;

  const mailOptions = {
    from: `"EMS System" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Welcome to EMS — Set Up Your Account",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
        <div style="background: #000000; padding: 24px; text-align: center;">
          <div style="display: inline-block; background: #fff; color: #000; width: 40px; height: 40px; line-height: 40px; border-radius: 6px; font-weight: 700; font-size: 16px; letter-spacing: -1px;">E/S</div>
        </div>
        <div style="padding: 32px 28px;">
          <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #09090b;">Welcome, ${name}!</h2>
          <p style="margin: 0 0 24px; font-size: 14px; color: #71717a; line-height: 1.6;">
            Your account on the Employee Management System has been created. Click the button below to set your own password and get started. This link expires in <strong>24 hours</strong>.
          </p>
          <a href="${setupURL}" style="display: block; background: #000; color: #fff; text-align: center; text-decoration: none; padding: 10px 0; border-radius: 6px; font-size: 14px; font-weight: 500; margin-bottom: 20px;">
            Set Up My Account
          </a>
          <p style="margin: 0 0 4px; font-size: 12px; color: #a1a1aa;">Or copy this link into your browser:</p>
          <p style="margin: 0; font-size: 11px; color: #71717a; word-break: break-all;">${setupURL}</p>
        </div>
        <div style="padding: 16px 28px; border-top: 1px solid #e4e4e7; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #a1a1aa;">If you did not expect this email, please contact your HR administrator.</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

async function sendPasswordResetEmail({ to, name, resetToken }) {
  const resetURL = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password/${resetToken}`;

  const mailOptions = {
    from: `"EMS System" <${process.env.EMAIL_USER}>`,
    to,
    subject: "EMS — Password Reset Request",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
        <div style="background: #000000; padding: 24px; text-align: center;">
          <div style="display: inline-block; background: #fff; color: #000; width: 40px; height: 40px; line-height: 40px; border-radius: 6px; font-weight: 700; font-size: 16px; letter-spacing: -1px;">E/S</div>
        </div>
        <div style="padding: 32px 28px;">
          <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #09090b;">Reset Your Password</h2>
          <p style="margin: 0 0 24px; font-size: 14px; color: #71717a; line-height: 1.6;">
            Hi ${name}, we received a request to reset your password. Click the button below to set a new one. This link expires in <strong>1 hour</strong>.
          </p>
          <a href="${resetURL}" style="display: block; background: #000; color: #fff; text-align: center; text-decoration: none; padding: 10px 0; border-radius: 6px; font-size: 14px; font-weight: 500; margin-bottom: 20px;">
            Reset Password
          </a>
          <p style="margin: 0 0 4px; font-size: 12px; color: #a1a1aa;">Or copy this link into your browser:</p>
          <p style="margin: 0; font-size: 11px; color: #71717a; word-break: break-all;">${resetURL}</p>
        </div>
        <div style="padding: 16px 28px; border-top: 1px solid #e4e4e7; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #a1a1aa;">If you didn't request a password reset, ignore this email — your password won't change.</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

async function sendLeaveStatusEmail({ to, name, status, leaveType, startDate, endDate, message: customMessage }) {
  const formattedStart = new Date(startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const formattedEnd = new Date(endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const statusConfig = {
    Approved:  { color: "#16a34a", bg: "#f0fdf4", label: "Approved" },
    Rejected:  { color: "#dc2626", bg: "#fef2f2", label: "Rejected" },
    Cancelled: { color: "#71717a", bg: "#f4f4f5", label: "Cancelled" },
  };
  const cfg = statusConfig[status] || { color: "#09090b", bg: "#fafafa", label: status };

  const mailOptions = {
    from: `"EMS System" <${process.env.EMAIL_USER}>`,
    to,
    subject: `EMS — Leave Request ${cfg.label}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
        <div style="background: #000000; padding: 24px; text-align: center;">
          <div style="display: inline-block; background: #fff; color: #000; width: 40px; height: 40px; line-height: 40px; border-radius: 6px; font-weight: 700; font-size: 16px; letter-spacing: -1px;">E/S</div>
        </div>
        <div style="padding: 32px 28px;">
          <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #09090b;">Leave Request ${cfg.label}</h2>
          <p style="margin: 0 0 24px; font-size: 14px; color: #71717a; line-height: 1.6;">Hi ${name}, your leave request has been reviewed.</p>
          <div style="background: ${cfg.bg}; border: 1px solid ${cfg.color}30; border-radius: 6px; padding: 16px 20px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 12px; color: #71717a; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Status</span>
              <span style="font-size: 13px; font-weight: 600; color: ${cfg.color};">${cfg.label}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 12px; color: #71717a; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Type</span>
              <span style="font-size: 13px; font-weight: 500; color: #09090b;">${leaveType}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 12px; color: #71717a; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Dates</span>
              <span style="font-size: 13px; font-weight: 500; color: #09090b;">${formattedStart} – ${formattedEnd}</span>
            </div>
          </div>
          ${customMessage ? `<p style="margin: 0; font-size: 13px; color: #52525b; line-height: 1.6; padding: 12px 16px; background: #fafafa; border-radius: 6px; border: 1px solid #e4e4e7;">${customMessage}</p>` : ""}
        </div>
        <div style="padding: 16px 28px; border-top: 1px solid #e4e4e7; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #a1a1aa;">If you have questions, contact your HR administrator.</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendAccountSetupEmail, sendPasswordResetEmail, sendLeaveStatusEmail };
