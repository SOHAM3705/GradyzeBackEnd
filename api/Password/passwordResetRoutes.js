const express = require("express");
const router = express.Router();
const User = require("../../models/useradmin");
const { resetPasswordEmail } = require("../../utils/emailTemplates");
const { Resend } = require("resend");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ Step 1: Send Password Reset Email
router.post("/verify-email", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 🔑 Generate a JWT Reset Token (valid for 30 minutes)
        const resetToken = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "30m" }
        );

        // Create reset link with JWT
        const resetLink = `https://gradyzefrontend.onrender.com/change-password?token=${resetToken}`;

        // Send email using Resend API
        await resend.emails.send({
            from: "Gradyze Support <support@gradyze.com>",
            to: user.email,
            subject: "Reset Your Password - Gradyze",
            html: resetPasswordEmail(user.name, resetLink),
        });

        console.log("📧 Email sent with JWT token");
        res.json({ message: "Password reset email sent successfully" });
    } catch (error) {
        console.error("❌ Error sending reset email:", error);
        res.status(500).json({ message: "Something went wrong." });
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

        // 🔑 Verify JWT Token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        // 🔍 Find User by ID
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 🔒 Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 🔄 Update User password
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Password reset error:", error);
        res.status(500).json({ message: "Failed to reset password" });
    }
});

module.exports = router;
