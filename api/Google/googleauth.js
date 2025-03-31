const express = require("express");
const passport = require("../../middleware/googleauth"); // Adjust path as needed
const jwt = require("jsonwebtoken");

const router = express.Router();

// ✅ Google Auth Route (Redirect to Google)
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// ✅ Google Auth Callback Route
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication failed!" });
    }
    
    // Get role from authInfo that was passed as the third parameter in the strategy
    const role = req.authInfo.role; // Will be "admin", "teacher", or "student"
    
    // Extract user ID and email
    const { _id, email } = req.user;
    
    // ✅ Generate JWT Token
    const token = jwt.sign(
      { id: _id, email, role }, // Include role in the payload
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    console.log("✅ Google Login Successful - Token:", token);
    
    // ✅ Redirect to frontend with token & role
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${token}&role=${role}`);
  }
);

// ✅ Token Verification Route
router.get("/verify-token", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]; // Get token from headers
  
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false, message: "Invalid token" });
  }
});

module.exports = router;