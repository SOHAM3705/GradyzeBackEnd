const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { OAuth2Client } = require("google-auth-library");

// Import all models
const Admin = require("../../models/useradmin");
const Teacher = require("../../models/teacheraccount");
const Student = require("../../models/studentModel");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Utility function to return token and data
const generateToken = (user, role) => {
  const payload = {
    id: user._id,
    email: user.email,
    role,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });
  return token;
};

// 🔹 POST /api/auth/google?role=admin | teacher | student
router.post("/google", async (req, res) => {
  const { token, role } = req.body;
  

  if (!["admin", "teacher", "student"].includes(role)) {
    return res.status(400).json({ message: "Invalid or missing role" });
  }

  try {
    // 1. Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;

    // 2. Select Model based on role
    let user;
    switch (role) {
      case "admin":
        user = await Admin.findOne({ email });
        break;
      case "teacher":
        user = await Teacher.findOne({ email });
        break;
      case "student":
        user = await Student.findOne({ email });
        break;
      default:
        return res.status(400).json({ message: "Invalid role" });
    }

    if (!user) {
      return res.status(401).json({ message: `${role} not found` });
    }

    // 3. Generate JWT
    const jwtToken = generateToken(user, role);

    // 4. Response based on role
    const baseResponse = {
      token: jwtToken,
      email: user.email,
      role,
    };

    switch (role) {
      case "admin":
        return res.json({
          ...baseResponse,
          name: user.name,
          adminId: user._id,
        });
      case "teacher":
        return res.json({
          ...baseResponse,
          name: user.name,
          teacherId: user._id,
          adminId: user.adminId,
        });
      case "student":
        return res.json({
          ...baseResponse,
          name: user.name,
          studentId: user._id,
          adminId: user.adminId,
          teacherId: user.teacherId,
        });
      default:
        return res.status(400).json({ message: "Invalid role" });
    }
  } catch (err) {
    console.error("❌ Google token verification failed:", err);
    return res.status(401).json({ message: "Invalid Google token" });
  }
});

module.exports = router;
