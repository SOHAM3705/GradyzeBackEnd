const express = require("express");
const router = express.Router();
const Admin = require("../../models/useradmin"); // Adjust path based on your structure
const jwt = require("jsonwebtoken");
const axios = require("axios");
const bcrypt = require("bcrypt"); // Import bcrypt for hashing passwords
const { resetPasswordEmail } = require("../../utils/emailTemplates"); // Import email template
const mongoose = require("mongoose");

const FRONTEND_URL = process.env.FRONTEND_URL || "https://gradyzefrontend.onrender.com"; // Ensure frontend URL is defined

// Route to verify email and send reset link
router.post("/verify-email", async (req, res) => {
    const { email } = req.body;

    try {
        const user = await Admin.findOne({ email });
        if (!user) return res.status(400).json({ message: "Email not found" });

        // Generate token (expires in 30 minutes)
        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "30m" });
        const resetLink = `${FRONTEND_URL}/change-password?token=${token}`;

        // Generate email content
        const emailContent = resetPasswordEmail(user.name, resetLink);

        // Send email via Resend API
        await axios.post("https://api.resend.com/emails", {
            from: "support@gradyze.com", // Ensure this email is verified in Resend
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

// Route to change password
router.post("/change-password", async (req, res) => {
    const { token, newPassword, confirmPassword } = req.body;

    // Check if passwords match
    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
    }

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await Admin.findOne({ email: decoded.email });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        // Hash and update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await Admin.findOneAndUpdate(
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
