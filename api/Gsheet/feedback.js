require('dotenv').config();
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Google Apps Script URLs stored in .env file
const GOOGLE_SHEETS_WEBHOOKS = {
  student: process.env.GOOGLE_SHEET_STUDENT_URL,
  teacher: process.env.GOOGLE_SHEET_TEACHER_URL,
  admin: process.env.GOOGLE_SHEET_ADMIN_URL,
};

// Function to send feedback to Google Sheets
const sendToGoogleSheets = async (formData, role) => {
  try {
    const webhookUrl = GOOGLE_SHEETS_WEBHOOKS[role];
    if (!webhookUrl) throw new Error("Invalid Google Sheets Webhook URL");

    const response = await axios.post(webhookUrl, formData, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data.status === "success";
  } catch (error) {
    console.error(`Error submitting ${role} feedback:`, error);
    return false;
  }
};

// Route to handle feedback submission based on role
router.post('/:role/submit-feedback', async (req, res) => {
  const { role } = req.params;
  if (!['student', 'teacher', 'admin'].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const success = await sendToGoogleSheets(req.body, role);
  if (success) {
    res.status(200).json({ message: `${role} feedback submitted successfully` });
  } else {
    res.status(500).json({ error: "Error submitting feedback" });
  }
});

module.exports = router;

