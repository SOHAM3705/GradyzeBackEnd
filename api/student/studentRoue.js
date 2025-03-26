const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const Student = require("../../models/studentModel");

const router = express.Router();

// ✅ Student Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log(`📩 Student login attempt for: ${email}`);

    // ✅ Find student with populated fields
    const student = await Student.findOne({ email })
      .select("+password")
      .populate("adminId", "name email")
      .populate("teacherId", "name email");

    if (!student) {
      console.log("❌ Student not found");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ Verify password
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      console.log("❌ Incorrect password");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ Generate JWT Token
    const token = jwt.sign(
      {
        id: student._id,
        email: student.email,
        adminId: student.adminId?._id,
        teacherId: student.teacherId?._id,
        role: "student",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      studentId: student._id,
      name: student.name,
      email: student.email,
      adminId: student.adminId?._id || null,
      teacherId: student.teacherId?._id || null,
    });

  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = router;



