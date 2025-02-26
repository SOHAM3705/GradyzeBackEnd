const express = require("express");
const router = express.Router();
const Teacher = require("../../models/teacheraccount"); // Use the Teacher model
const jwt = require("jsonwebtoken");
const axios = require("axios");
const bcrypt = require("bcrypt");
const { resetPasswordEmail } = require("../../utils/emailTemplates");
const mongoose = require("mongoose");

const FRONTEND_URL = process.env.FRONTEND_URL || "https://gradyzefrontend.onrender.com"; 

// ✅ Route: Verify email & send reset link
router.post("/verify-email", async (req, res) => {
    const { email } = req.body;

    try {
        const teacher = await Teacher.findOne({ email });
        if (!teacher) return res.status(400).json({ message: "Email not found" });

        // Generate reset token (expires in 30 minutes)
        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "30m" });
        const resetLink = `${FRONTEND_URL}/change-password?token=${token}`;

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
    } catch {
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// ✅ Route: Change password
router.post("/change-password", async (req, res) => {
    const { token, newPassword, confirmPassword } = req.body;

    // Check if passwords match
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
        await Teacher.findOneAndUpdate(
            { email: decoded.email },
            { $set: { password: hashedPassword } },
            { new: true }
        );

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(400).json({ message: "Token has expired. Please request a new reset link." });
        }

        res.status(400).json({ message: "Invalid or expired token" });
    }
});

module.exports = router;
