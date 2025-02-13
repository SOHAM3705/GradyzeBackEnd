const express = require("express");
const axios = require("axios");
const router = express.Router();
require("dotenv").config(); // Ensure .env is loaded

const FEEDBACK_FORM_URL = process.env.FEEDBACK_FORM_URL;

router.post("/Adminfeedback", async (req, res) => {
  const { name, email, feedback, opinions } = req.body;

  if (!name || !email || !feedback || !opinions) {
    return res.status(400).json({ success: false, error: "All fields are required" });
  }

  try {
    const response = await axios.post(FEEDBACK_FORM_URL, { name, email, feedback, opinions });
    console.log("Google Sheets Response:", response.data); // Log response for debugging

    res.status(200).json({ success: true, message: "Feedback stored successfully!" });
  } catch (error) {
    console.error("Error storing feedback:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: "Failed to store message" });
  }
});

module.exports = router;
