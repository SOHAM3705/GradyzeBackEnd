const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Student = require("../../models/studentModel");
require("dotenv").config();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Please enter both email and password." });
  }

  try {
    const student = await Student.findOne({ email })
      .populate("adminId", "name email") // Fetch Admin details
      .populate("teacherId", "name email"); // Fetch Teacher details

    if (!student) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { studentId: student._id, name: student.name, adminId: student.adminId._id, teacherId: student.teacherId._id },
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
        adminId: student.adminId._id,
        teacherId: student.teacherId._id,
      },
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

module.exports = router;
