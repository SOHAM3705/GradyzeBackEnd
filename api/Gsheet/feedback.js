const express = require("express");
const axios = require("axios");
const router = express.Router();

const FEEDBACK_FORM_URL = process.env.FEEDBACK_FORM_URL; // Get from .env file

// Middleware to validate input
const validateInput = (req, res, next) => {
  const { name, email, feedback, opinions } = req.body;

  if (!name || !email || !feedback || !opinions) {
    return res.status(400).json({ success: false, error: "All fields are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: "Invalid email format" });
  }

  if (name.length > 100 || feedback.length > 1000 || opinions.length > 1000) {
    return res.status(400).json({ success: false, error: "Input exceeds maximum length" });
  }

  next();
};

router.post("/Adminfeedback", validateInput, async (req, res) => {
  const { name, email, feedback, opinions } = req.body;

  if (!FEEDBACK_FORM_URL) {
    console.error("FEEDBACK_FORM_URL is not defined in the environment variables.");
    return res.status(500).json({ success: false, error: "Server configuration error" });
  }

  try {
    const response = await axios.post(FEEDBACK_FORM_URL, { name, email, feedback, opinions });
    console.log("Google Sheets API Response:", response.data);
    console.log(`Feedback received from ${name} (${email})`); // Log successful submission
    res.status(200).json({ success: true, message: "Feedback stored in Google Sheets!" });
  } catch (error) {
    console.error("Error sending feedback to Google Sheets:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: "Failed to store feedback",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;