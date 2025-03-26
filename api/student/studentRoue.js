const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const Student = require("../../models/studentModel");

const router = express.Router();

router.post("/student/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔍 Find student by email
    const student = await Student.findOne({ email });

    if (!student) {
      console.log("❌ Student not found for email:", email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 🔍 Compare entered password with hashed password in DB
    console.log("📌 Entered Password:", password);
    console.log("📌 Stored Hashed Password:", student.password);

    const isMatch = await bcrypt.compare(password, student.password);
    console.log("📌 Password Match:", isMatch);

    if (!isMatch) {
      console.log("❌ Password mismatch");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ If password matches, generate JWT and send response
    const token = jwt.sign({ id: student._id }, "your_jwt_secret", { expiresIn: "1h" });

    res.status(200).json({ message: "Login successful", token });

  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


module.exports = router;