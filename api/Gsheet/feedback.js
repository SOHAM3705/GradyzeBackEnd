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

// Validate required environment variables on startup
const validateEnvVars = () => {
  const missing = Object.entries(GOOGLE_SHEETS_WEBHOOKS)
    .filter(([_, url]) => !url)
    .map(([role]) => role);
  
  if (missing.length > 0) {
    console.error(`Missing environment variables for roles: ${missing.join(', ')}`);
    console.error('Please ensure all GOOGLE_SHEET_*_URL variables are set in your .env file');
    process.exit(1); // Exit if critical configuration is missing
  }
};

// Run validation on module load
validateEnvVars();

// Basic schema validation for different roles
const validateFormData = (data, role) => {
  const requiredFields = {
    student: ['name', 'studentId', 'feedback'],
    teacher: ['name', 'department', 'feedback'],
    admin: ['name', 'position', 'feedback']
  };
  
  // Check that all required fields exist and are not empty
  return requiredFields[role].every(field => 
    data[field] && typeof data[field] === 'string' && data[field].trim() !== ''
  );
};

// Function to send feedback to Google Sheets
const sendToGoogleSheets = async (formData, role) => {
  try {
    const webhookUrl = GOOGLE_SHEETS_WEBHOOKS[role];
    if (!webhookUrl) {
      throw new Error(`Missing webhook URL for role: ${role}`);
    }

    // Add timestamp and sanitize data
    const sanitizedData = {
      ...formData,
      timestamp: new Date().toISOString()
    };

    const response = await axios.post(webhookUrl, sanitizedData, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000 // 10 second timeout
    });

    // Check for valid response from Google Apps Script
    if (response.data && response.data.status === "success") {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: "Invalid response from Google Sheets" 
      };
    }
  } catch (error) {
    console.error(`Error submitting ${role} feedback:`, error.message);
    return { 
      success: false, 
      error: error.message || "Unknown error occurred" 
    };
  }
};

// Rate limiting map (simple in-memory implementation)
const requestCounts = {};
const RATE_LIMIT = 5; // 5 requests
const RATE_WINDOW = 60 * 1000; // 1 minute

// Route to handle feedback submission based on role
router.post('/:role/submit-feedback', async (req, res) => {
  const { role } = req.params;
  const clientIp = req.ip || req.connection.remoteAddress;
  
  // 1. Validate role
  if (!['student', 'teacher', 'admin'].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  
  // 2. Apply basic rate limiting
  const key = `${clientIp}-${role}`;
  if (!requestCounts[key]) {
    requestCounts[key] = { count: 0, resetAt: Date.now() + RATE_WINDOW };
    
    // Clean up expired entries
    setTimeout(() => {
      delete requestCounts[key];
    }, RATE_WINDOW);
  } else if (requestCounts[key].count >= RATE_LIMIT) {
    return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
  }
  
  requestCounts[key].count++;
  
  // 3. Validate form data
  if (!validateFormData(req.body, role)) {
    return res.status(400).json({ error: "Missing or invalid required fields" });
  }

  // 4. Submit to Google Sheets
  const result = await sendToGoogleSheets(req.body, role);
  
  if (result.success) {
    res.status(200).json({ message: `${role} feedback submitted successfully` });
  } else {
    res.status(500).json({ 
      error: "Error submitting feedback", 
      details: result.error 
    });
  }
});

module.exports = router;
