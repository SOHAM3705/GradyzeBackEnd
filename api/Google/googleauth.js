const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const Admin = require("../../models/useradmin");
const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🔹 Verify Google ID token sent from frontend
router.post("/google", async (req, res) => {
  const { token } = req.body;  // Renamed 'credential' to 'token' to align with the frontend request

  try {
    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: token,  // This is where we use the 'token' passed from the frontend
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    // Extract payload from the token
    const payload = ticket.getPayload();
    const email = payload.email;

    // Find the admin in the database based on the email
    const existingAdmin = await Admin.findOne({ email });
    if (!existingAdmin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    // Generate JWT token for the authenticated admin
    const jwtToken = jwt.sign(
      { id: existingAdmin._id, email: existingAdmin.email, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Return JWT token and user info (name, adminId, role)
    res.json({
      token: jwtToken,
      name: existingAdmin.name,
      adminId: existingAdmin._id,
      role: "admin",
    });
  } catch (error) {
    // Catch any errors during token verification
    console.error("❌ Google token verification failed:", error);
    return res.status(401).json({ message: "Invalid token" });
  }
});

module.exports = router;
