const express = require("express");
const axios = require("axios");
const router = express.Router();

const FEEDBACK_FORM_URL = process.env.FEEDBACK_FORM_URL; // Get from .env file

router.post("/Adminfeedback", async (req, res) => {
  const { name, email, feedback, opinions } = req.body;

  if (!name || !email || !feedback || !opinions) {
    return res.status(400).json({ success: false, error: "All fields are required" });
  }

  try {
    await axios.post(FEEDBACK_FORM_URL, { name, email, feedback, opinions });
    res.status(200).json({ success: true, message: "" });
  } catch {
    res.status(500).json({ success: false, error: "Failed to store message" });
  }
});

module.exports = router;
