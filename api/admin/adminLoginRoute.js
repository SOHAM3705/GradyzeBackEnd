const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config(); // Load environment variables
const Admin = require("../../models/useradmin"); // Ensure correct import path

const router = express.Router(); // Using express.Router()

// Admin Login Route
router.post("/adminlogin", async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log(`Received login request for email: ${email}`);
    const admin = await Admin.findOne({ email }).select("+password"); // Explicitly include password field

    if (!admin) {
      console.log("Admin not found");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      console.log("Password does not match");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role }, // Include role
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    
    

    res.status(200).json({
      message: "Login successful",
      token, // Send the token in response
      adminId: admin._id,
      name: admin.name, // Send Admin Name in Response
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = router;

  