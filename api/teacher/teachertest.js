const express = require('express');
const router = express.Router();
const Test = require('../../models/Test');

// Create a new test
router.post('/create-test', async (req, res) => {
  const { title, teacherId, questions } = req.body;
  try {
    const newTest = await Test.create({ title, teacherId, questions });
    const testLink = `${process.env.BASE_URL}/test/${newTest._id}`;
    res.status(201).json({ message: "Test created", testLink });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create test" });
  }
});

// Get test by ID
router.get('/test/:id', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ error: "Test not found" });
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: "Error fetching test" });
  }
});

module.exports = router;
