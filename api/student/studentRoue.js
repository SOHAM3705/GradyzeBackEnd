const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Student = require("../../models/studentModel");

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



module.exports = router;
