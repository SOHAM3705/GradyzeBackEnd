const express = require("express");
const passport = require("../../middleware/googleauth"); // Google Auth Middleware
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

    // ✅ Extract user details
    const { _id, email, role } = req.user; // `role` should be `Admin`, `Faculty`, or `Student`

    // ✅ Generate JWT Token
    const token = jwt.sign(
      { id: _id, email, role }, // Payload
      process.env.JWT_SECRET, // Secret Key
      { expiresIn: "7d" } // Expiry
    );

    console.log("✅ Google Login Successful - Token:", token);

    // ✅ Redirect to frontend with token & role
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${token}&role=${role}`);
  }
);

// ✅ Token Verification Route (Optional)
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
