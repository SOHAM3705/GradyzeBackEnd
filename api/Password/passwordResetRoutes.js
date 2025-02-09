const express = require("express");
const router = express.Router();
const User = require("../../models/useradmin"); // Adjust path based on your structure
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { resetPasswordEmail } = require("../../utils/emailTemplates"); // Import email template

router.post("/verify-email", async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Email not found" });

        // Generate token
        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "30m" });
        const resetLink = `${process.env.FRONTEND_URL}/change-password?token=${token}`;

        // Generate email content
        const emailContent = resetPasswordEmail(user.name, resetLink);

        // Send email via Resend API
        await axios.post("https://api.resend.com/emails", {
            from: "support@gradyze.com",  // Change to your verified email
            to: email,
            subject: "Reset Your Password",
            html: emailContent,
        }, {
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
        });
        

        res.json({ message: "Verification email sent" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Change Password
router.post("/change-password", async (req, res) => {
    const { token, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ email: decoded.email });

        if (!user) return res.status(400).json({ message: "Invalid token" });

        // Hash and update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: "Invalid or expired token" });
    }
});

module.exports = router;
