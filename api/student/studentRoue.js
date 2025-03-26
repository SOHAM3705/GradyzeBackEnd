const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Student = require("../../models/studentModel");
const axios = require("axios");

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Please enter both email and password." });
    }

    const student = await Student.findOne({ email })
      .populate("adminId", "name email")
      .populate("teacherId", "name email");

    if (!student) {
      console.log("❌ Student not found for email:", email);
      return res.status(401).json({ error: "Invalid email or password." });
    }

    console.log("📌 Stored Hashed Password:", student.password);
    console.log("📌 Input Password:", password);

    const isMatch = await bcrypt.compare(password, student.password);
    
    if (!isMatch) {
      console.log("❌ Password mismatch");
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { studentId: student._id, name: student.name, adminId: student.adminId, teacherId: student.teacherId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        adminId: student.adminId,
        teacherId: student.teacherId,
      },
    });

  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

const FRONTEND_URL = process.env.FRONTEND_URL || "https://gradyzefrontend.onrender.com"; 

// ✅ Verify Email & Send Reset Link
router.post("/verify-email", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        // 🔍 Check if student exists
        const student = await Student.findOne({ email });
        if (!student) return res.status(404).json({ message: "Student not found" });

        // 🔑 Generate reset token (valid for 30 mins)
        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "30m" });
        const resetLink = `${FRONTEND_URL}/change-password?token=${token}`;

        // 📧 Send email using Resend API
        const emailResponse = await axios.post(
            "https://api.resend.com/emails",
            {
                from: "support@gradyze.com", // Must be verified in Resend
                to: email,
                subject: "Reset Your Password",
                html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 30 minutes.</p>`,
            },
            {
                headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
            }
        );

        if (emailResponse.status !== 200) {
            throw new Error("Failed to send email");
        }

        res.status(200).json({ message: "Password reset email sent successfully" });
    } catch (error) {
        console.error("Error sending reset email:", error);
        res.status(500).json({ message: "Failed to send reset link" });
    }
});

module.exports = router;




