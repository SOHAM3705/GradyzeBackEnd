const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Redirect user to Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Google authentication failed" });
    }

    console.log("✅ Google OAuth User:", req.user);  // Debugging

    // Generate JWT Token based on user role
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Construct redirect URL based on role
    let redirectUrl = "";
    if (req.user.role === "admin") {
      redirectUrl = `https://gradyze.com/adminlogin?token=${token}`;
    } else if (req.user.role === "teacher") {
      redirectUrl = `https://gradyze.com/teacherlogin?token=${token}`;
    } else if (req.user.role === "student") {
      redirectUrl = `https://gradyze.com/studentlogin?token=${token}`;
    } else {
      return res.status(400).json({ message: "Role not found" });
    }

    console.log("🔗 Redirecting to:", redirectUrl);  // Debugging
    res.redirect(redirectUrl);  // Redirect to the frontend with token
  }
);


module.exports = router;

