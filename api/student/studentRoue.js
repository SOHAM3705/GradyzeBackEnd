const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const Student = require("../../models/studentModel"); // Student collection
const User = require("../../models/adminsettingmodel"); // Profile collection

const router = express.Router();

// ✅ Student Login Route
router.post("/studentlogin", async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log(`Received login request for email: ${email}`);
    
    // ✅ Fetch student with password field
    const student = await Student.findOne({ email }).select("+password");
    if (!student) {
      console.log("❌ Student not found");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ Verify password
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      console.log("❌ Password does not match");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ Ensure the student's profile exists in `User` collection
    let profile = await User.findOne({ email });
    if (!profile) {
      console.log(`⚠️ No profile found for ${email}, creating one...`);
      profile = await User.create({ email, name: student.name });
      console.log(`✅ Profile created for ${email}`);
    }

    // ✅ Generate JWT Token
    const token = jwt.sign(
      { id: student._id, email: student.email, role: "student" }, // Explicit role assignment
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token, // Send JWT Token
      studentId: student._id,
      name: student.name, // Send Student Name in Response
      adminId: student.adminId || "", // Ensure it doesn't return undefined
      teacherId: student.teacherId || "", // Ensure it doesn't return undefined
    });

  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = router;