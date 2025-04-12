const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const Admin = require("../../models/useradmin");
const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🔹 Verify Google ID token sent from frontend
router.post("/google", async (req, res) => {
  const { credential } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;

    const existingAdmin = await Admin.findOne({ email });
    if (!existingAdmin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    const token = jwt.sign(
      { id: existingAdmin._id, email: existingAdmin.email, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, name: existingAdmin.name, adminId: existingAdmin._id, role: "admin" });
  } catch (error) {
    console.error("❌ Google token verification failed:", error);
    res.status(401).json({ message: "Invalid token" });
  }
});


module.exports = router;