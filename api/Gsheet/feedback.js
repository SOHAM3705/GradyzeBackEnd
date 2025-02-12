const express = require("express");
const axios = require("axios");
const router = express.Router();

const FEEDBACK_FORM_URL = process.env.FEEDBACK_FORM_URL; // Get from .env file

router.post("/feedback", async (req, res) => {
  const { name, email, feedback, opinions } = req.body;

  if (!name || !email || !feedback || !opinions) {
    return res.status(400).json({ success: false, error: "All fields are required" });
  }

  try {
    await axios.post(FEEDBACK_FORM_URL, { name, email, feedback, opinions });

    res.status(200).json({ success: true, message: "Feedback stored in Google Sheets!" });
  } catch (error) {
    console.error("Error sending feedback to Google Sheets:", error);
    res.status(500).json({ success: false, error: "Failed to store feedback" });
  }
});

module.exports = router;
