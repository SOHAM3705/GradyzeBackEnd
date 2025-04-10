const express = require("express");
const router = express.Router();
const Teacher = require("../../models/teacheraccount");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const bcrypt = require("bcryptjs"); // Changed to bcryptjs for better compatibility
const dotenv = require("dotenv");
const { resetPasswordEmail } = require("../../utils/emailTemplates");
const { Resend } = require("resend");

dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL || "https://gradyzefrontend.onrender.com"; 

// ✅ Step 1: Verify Email & Send Reset Link
router.post("/verify-email", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        // 🔍 Check if teacher exists
        const teacher = await Teacher.findOne({ email });
        if (!teacher) return res.status(404).json({ message: "Teacher not found" });

        // 🔑 Generate reset token valid for 30 minutes
        const token = jwt.sign({ id: teacher._id }, process.env.JWT_SECRET, { expiresIn: "30m" });
        const resetLink = `${FRONTEND_URL}/teacher-change-password?token=${token}`;

        // 📧 Send email via Resend API
        const emailResponse = await axios.post(
            "https://api.resend.com/emails",
            {
                from: "support@gradyze.com",
                to: email,
                subject: "Reset Your Password",
                html: resetPasswordEmail(teacher.name, resetLink),
            },
            {
                headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
            }
        );

        if (emailResponse.status !== 200) {
            throw new Error("Failed to send email");
        }

        res.status(200).json({ message: "Verification email sent successfully" });
    } catch (error) {
        console.error("Error sending reset email:", error);
        res.status(500).json({ message: "Failed to send reset link" });
    }
});

// ✅ Step 2: Reset Password
router.post("/change-password", async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;

        // 🔍 Validate input
        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        // 🔑 Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        // 🔍 Find teacher
        const teacher = await Teacher.findById(decoded.id);
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        // 🔒 Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 🔄 Update teacher password
        await Teacher.updateOne({ _id: decoded.id }, { $set: { password: hashedPassword } });

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Password reset error:", error);
        if (error.name === "TokenExpiredError") {
            return res.status(400).json({ message: "Token has expired. Please request a new reset link." });
        }
        res.status(500).json({ message: "Failed to reset password" });
    }
});

module.exports = router;
