const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const Admin = require("../../models/useradmin"); // Admin collection
const User = require("../../models/adminsettingmodel"); // Profile collection

const router = express.Router();

// ✅ Admin Login Route
router.post("/adminlogin", async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log(`Received login request for email: ${email}`);
    
    // ✅ Fetch admin with password field
    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) {
      console.log("❌ Admin not found");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ Verify password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      console.log("❌ Password does not match");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ Ensure the user's profile exists in `User` collection
    let profile = await User.findOne({ email });
    if (!profile) {
      console.log(`⚠️ No profile found for ${email}, creating one...`);
      profile = await User.create({ email, name: admin.name });
      console.log(`✅ Profile created for ${email}`);
    }

    // ✅ Generate JWT Token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: "admin" }, // Explicit role assignment
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token, // Send JWT Token
      adminId: admin._id,
      name: admin.name, // Send Admin Name in Response
    });

  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = router;
