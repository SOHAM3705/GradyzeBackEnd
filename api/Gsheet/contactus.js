const express = require("express");
const axios = require("axios");
const router = express.Router();

const CONTACT_FORM_URL = process.env.CONTACT_FORM_URL; // Get from .env file

router.post("/contactus", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, error: "All fields are required" });
  }

  try {
    await axios.post(CONTACT_FORM_URL, { name, email, subject, message });
    res.status(200).json({ success: true, message: "" });
  } catch {
    res.status(500).json({ success: false, error: "Failed to store message" });
  }
});

module.exports = router;
