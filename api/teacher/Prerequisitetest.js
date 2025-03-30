const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

// Load environment variables
require('dotenv').config();

// Initialize OAuth client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// MongoDB model (assuming you're using MongoDB)
const Test = require('../../models/prerequisitetest'); // Adjust the path as necessary

// Middleware to verify token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication token is required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Google OAuth login route
router.post('/auth/google', async (req, res) => {
  try {
    const { tokenId } = req.body;
    
    // Verify the Google token
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const { email, name, picture } = ticket.getPayload();
    
    // Create a JWT token for our app
    const token = jwt.sign(
      { email, name, picture },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.status(200).json({
      success: true,
      token,
      user: { email, name, picture }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Authentication failed', error: error.message });
  }
});

// Get all tests for the authenticated user
router.get('/tests', authenticateToken, async (req, res) => {
  try {
    const tests = await Test.find({ userEmail: req.user.email })
      .sort({ createdAt: -1 });
    
    res.status(200).json(tests);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ message: 'Failed to fetch tests', error: error.message });
  }
});

// Create a new test
router.post('/tests', authenticateToken, async (req, res) => {
  try {
    const { title, department, year, semester, description, questions } = req.body;
    
    // Validate the input
    if (!title || !department || !year || !semester || !description || !questions) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Set up Google Forms API
    const forms = google.forms({ version: 'v1', auth: oauth2Client });
    
    // Create a new Google Form
    const createFormResponse = await forms.forms.create({
      requestBody: {
        info: {
          title: title,
          documentTitle: `${department} - ${year} - ${semester} - ${title}`
        }
      }
    });
    
    const formId = createFormResponse.data.formId;
    
    // Add form description
    await forms.forms.batchUpdate({
      formId: formId,
      requestBody: {
        requests: [{
          updateFormInfo: {
            info: {
              description: description
            },
            updateMask: 'description'
          }
        }]
      }
    });
    
    // Create questions for the form
    const questionRequests = [];
    
    for (let i = 1; i <= questions; i++) {
      // Mix of question types
      if (i % 3 === 0) {
        // Multiple choice
        questionRequests.push({
          createItem: {
            item: {
              title: `Question ${i}`,
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'RADIO',
                    options: [
                      { value: 'Option A' },
                      { value: 'Option B' },
                      { value: 'Option C' },
                      { value: 'Option D' }
                    ],
                    shuffle: true
                  }
                }
              }
            },
            location: { index: i - 1 }
          }
        });
      } else if (i % 3 === 1) {
        // Short answer
        questionRequests.push({
          createItem: {
            item: {
              title: `Question ${i}`,
              questionItem: {
                question: {
                  required: true,
                  textQuestion: {
                    paragraph: false
                  }
                }
              }
            },
            location: { index: i - 1 }
          }
        });
      } else {
        // Paragraph
        questionRequests.push({
          createItem: {
            item: {
              title: `Question ${i}`,
              questionItem: {
                question: {
                  required: true,
                  textQuestion: {
                    paragraph: true
                  }
                }
              }
            },
            location: { index: i - 1 }
          }
        });
      }
    }
    
    // Add questions to the form
    await forms.forms.batchUpdate({
      formId: formId,
      requestBody: {
        requests: questionRequests
      }
    });
    
    // Create a new test in the database
    const newTest = new Test({
      title,
      department,
      year,
      semester,
      description,
      questions,
      formId,
      formLink: `https://docs.google.com/forms/d/${formId}/viewform`,
      userEmail: req.user.email,
      userName: req.user.name,
      createdAt: new Date().toLocaleString()
    });
    
    const savedTest = await newTest.save();
    
    res.status(201).json(savedTest);
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ 
      message: 'Failed to create test', 
      error: error.message 
    });
  }
});

// Get a single test by ID
router.get('/tests/:id', authenticateToken, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    // Check if the test belongs to the authenticated user
    if (test.userEmail !== req.user.email) {
      return res.status(403).json({ message: 'Unauthorized access to this test' });
    }
    
    res.status(200).json(test);
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ message: 'Failed to fetch test', error: error.message });
  }
});

// Delete a test
router.delete('/tests/:id', authenticateToken, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    // Check if the test belongs to the authenticated user
    if (test.userEmail !== req.user.email) {
      return res.status(403).json({ message: 'Unauthorized access to this test' });
    }
    
    // Delete the Google Form
    await forms.forms.delete({ formId: test.formId });
    
    // Delete the test from the database
    await Test.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({ message: 'Failed to delete test', error: error.message });
  }
});


// Export the router and the app setup function
module.exports = router;
