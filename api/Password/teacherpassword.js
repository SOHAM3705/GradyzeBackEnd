const express = require("express");
const router = express.Router();
const Teacher = require("../../models/teacheraccount");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const bcrypt = require("bcrypt");
const { resetPasswordEmail } = require("../../utils/emailTemplates");

const FRONTEND_URL = process.env.FRONTEND_URL || "https://gradyzefrontend.onrender.com"; 

// ✅ Route: Verify email & send reset link
router.post("/verify-email", async (req, res) => {
    const { email } = req.body;

    try {
        const teacher = await Teacher.findOne({ email });
        if (!teacher) return res.status(400).json({ message: "Email not found" });

        // Generate reset token (expires in 30 minutes)
        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "30m" });
        const resetLink = `${FRONTEND_URL}/teacher-change-password?token=${token}`;

        // Email content
        const emailContent = resetPasswordEmail(teacher.name, resetLink);

        // Send email via Resend API
        await axios.post("https://api.resend.com/emails", {
            from: "support@gradyze.com",
            to: email,
            subject: "Reset Your Password",
            html: emailContent,
        }, {
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
        });

        res.json({ message: "Verification email sent successfully" });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// ✅ Route: Change password (with token verification)
router.post("/change-password", async (req, res) => {
    const { token, newPassword, confirmPassword } = req.body;

    // Validate password match
    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
    }

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teacher = await Teacher.findOne({ email: decoded.email });

        if (!teacher) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        // Hash & update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        teacher.password = hashedPassword;
        await teacher.save();

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(400).json({ message: "Token has expired. Please request a new reset link." });
        }
        console.error("Error changing password:", error);
        res.status(400).json({ message: "Invalid or expired token" });
    }
});

module.exports = router;
