const express = require("express");
const router = express.Router();
const User = require("../../models/useradmin");
const crypto = require("crypto");
const { resetPasswordEmail } = require("../../utils/emailTemplates");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY); // Store your API key in .env file

// Password Reset Request
router.post("/verify-email", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // Token expires in 30 minutes

        await user.save();

        // Create reset link
        const resetLink = `https://gradyzefrontend.onrender.com/change-password?token=${resetToken}`;

        // Send email using Resend API
        const response = await resend.emails.send({
            from: "Gradyze Support <support@gradyze.com>",
            to: user.email,
            subject: "Reset Your Password - Gradyze",
            html: resetPasswordEmail(user.name, resetLink),
        });

        console.log("📧 Email sent via Resend:", response);
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

        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(400).json({ message: "Token has expired. Please request a new reset link." });
            }
            return res.status(400).json({ message: "Invalid token." });
        }

        // 🔍 Find user
        const user = await Admin.findOne({ email: decoded.email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 🛠 Check if the new password is the same as the old password
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({ message: "New password must be different from the old password." });
        }

        // 🔒 Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 🔄 Update user password
        await Admin.updateOne({ email: decoded.email }, { $set: { password: hashedPassword } });

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Password reset error:", error);
        res.status(500).json({ message: "Failed to reset password" });
    }
});

module.exports = router;
