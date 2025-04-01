const express = require("express");
const passport = require("../../middleware/googleauth"); // Adjust path as needed
const jwt = require("jsonwebtoken");

const router = express.Router();

// ✅ Google Auth Route (Redirect to Google)
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// ✅ Google Callback Route
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Authentication failed!" });
    }

    // Extract user role and details
    const role = req.authInfo.role; // Get user role (admin, teacher, student)
    const { _id, email } = req.user; // Extract user ID and email

    // ✅ Generate JWT Token
    const token = jwt.sign(
      { id: _id, email, role }, // Include role in the payload
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // Token expiration time
    );

    console.log("✅ Google Login Successful - Token:", token);
    console.log("🔹 User Role:", role);

    // ✅ Define role-based frontend redirect paths
    let frontendRedirectPath = "/login"; // Default fallback

    // Set redirect path based on user role
    switch (role) {
      case "admin":
        frontendRedirectPath = "/adminlogin";
        break;
      case "teacher":
        frontendRedirectPath = "/teacherlogin";
        break;
      case "student":
        frontendRedirectPath = "/studentlogin";
        break;
      default:
        return res.status(403).json({ message: "Access denied: Invalid role." });
    }

    // ✅ Redirect to the correct frontend login page with token & role
    res.redirect(`${process.env.FRONTEND_URL}${frontendRedirectPath}?token=${token}&role=${role}`);
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
    console.error("❌ Token verification error:", error);
    res.status(401).json({ valid: false, message: "Invalid token" });
  }
});

module.exports = router;