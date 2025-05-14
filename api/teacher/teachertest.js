const express = require('express');
const router = express.Router();
const Test = require('../../models/Test');
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/testauth');

router.get('/teacher/me', auth, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id)
      .populate('subjects')
      .populate('assignedClass');
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });
    
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: "Error fetching teacher data" });
  }
});

// Create a new test (protected route)
router.post('/create-test', auth, [
  check('title', 'Title is required').not().isEmpty(),
  check('questions', 'At least one question is required').isArray({ min: 1 }),
  check('questions.*.questionText', 'Question text is required').not().isEmpty(),
  check('questions.*.options', 'At least 2 options are required').isArray({ min: 2 }),
  check('questions.*.correctAnswer', 'Correct answer is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, questions, duration } = req.body;
  
  try {
    const newTest = await Test.create({ 
      title, 
      teacherId: req.user.id, 
      questions,
      duration
    });
    
    const testLink = `${process.env.BASE_URL}/test/${newTest._id}`;
    res.status(201).json({ 
      message: "Test created successfully", 
      testLink,
      testId: newTest._id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get test by ID (protected - teacher only)
router.get('/test/:id', auth, async (req, res) => {
  try {
    const test = await Test.findOne({
      _id: req.params.id,
      teacherId: req.user.id
    });
    
    if (!test) {
      return res.status(404).json({ error: "Test not found or unauthorized" });
    }
    
    res.json(test);
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: "Test not found" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

// Update a test (protected route)
router.put('/update-test/:id', auth, [
  check('title', 'Title is required').optional().not().isEmpty(),
  check('questions', 'Questions must be an array').optional().isArray(),
  check('status', 'Status must be either draft or published').optional().isIn(['draft', 'published']),
  check('duration', 'Duration must be a number').optional().isNumeric()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const test = await Test.findOne({
      _id: req.params.id,
      teacherId: req.user.id
    });

    if (!test) {
      return res.status(404).json({ error: "Test not found or unauthorized" });
    }

    // Only update fields that are provided
    if (req.body.title) test.title = req.body.title;
    if (req.body.questions) test.questions = req.body.questions;
    if (req.body.status) test.status = req.body.status;
    if (req.body.duration) test.duration = req.body.duration;

    await test.save();
    res.json({ message: "Test updated successfully", test });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all tests for a teacher (protected route)
router.get('/my-tests', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { teacherId: req.user.id };
    
    if (status) {
      filter.status = status;
    }

    const tests = await Test.find(filter)
      .sort({ createdAt: -1 })
      .select('-questions'); // Exclude questions for listing

    res.json(tests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a test (protected route)
router.delete('/delete-test/:id', auth, async (req, res) => {
  try {
    const test = await Test.findOneAndDelete({
      _id: req.params.id,
      teacherId: req.user.id
    });

    if (!test) {
      return res.status(404).json({ error: "Test not found or unauthorized" });
    }

    res.json({ message: "Test deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get test with answers (for teacher review)
router.get('/test-with-answers/:id', auth, async (req, res) => {
  try {
    const test = await Test.findOne({
      _id: req.params.id,
      teacherId: req.user.id
    });

    if (!test) {
      return res.status(404).json({ error: "Test not found or unauthorized" });
    }

    res.json(test);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Publish a test (change status from draft to published)
router.patch('/publish-test/:id', auth, async (req, res) => {
  try {
    const test = await Test.findOne({
      _id: req.params.id,
      teacherId: req.user.id
    });

    if (!test) {
      return res.status(404).json({ error: "Test not found or unauthorized" });
    }

    if (test.status === 'published') {
      return res.status(400).json({ error: "Test is already published" });
    }

    test.status = 'published';
    await test.save();

    res.json({ message: "Test published successfully", testLink: `${process.env.BASE_URL}/test/${test._id}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
