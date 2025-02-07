const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config(); // Load environment variables
const Admin = require("../../models/useradmin"); // Ensure correct import path

const router = express.Router();

// Admin Sign-Up Route
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, university, college } = req.body;

    console.log("🔵 Signup Request Received:", req.body);

    // Check for missing fields
    if (!name || !email || !password || !university || !college) {
      console.log("⚠️ Missing Fields");
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if the admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log("⚠️ Admin already exists");
      return res.status(400).json({ message: "Admin already exists" });
    }

    // Hash password before saving
    console.log("🔄 Hashing Password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new admin
    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      university,
      college,
    });

    console.log("💾 Saving Admin to Database...");
    await newAdmin.save();

    // Generate JWT Token
    const token = jwt.sign({ id: newAdmin._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    console.log("✅ Admin created successfully:", newAdmin);
    res.status(201).json({
      message: "Admin created successfully",
      token, // Send the JWT token
      adminId: newAdmin._id,
    });

  } catch (error) {
    console.error("🔴 Signup Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = router;

