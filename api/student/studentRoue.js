const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const Student = require("../../models/studentModel");

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  console.log("📌 Received Request Body:", req.body);

  if (!email || !password) {
    console.log("❌ Missing email or password");
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const student = await Student.findOne({ email });

    if (!student) {
      console.log("❌ Student not found for email:", email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      console.log("❌ Password mismatch for email:", email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    console.log("✅ Login Successful:", student);
    res.status(200).json({ message: "Login successful", student });

  } catch (error) {
    console.error("❌ Server Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;