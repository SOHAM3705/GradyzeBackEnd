const express = require("express");
const router = express.Router();
const Syllabus = require("../../models/syllabusmodel");
const authMiddleware = require("../middleware/authMiddleware");

// Get syllabus data for a specific teacher under a specific admin
router.get("/teacher/:teacherId/:adminId", authMiddleware, async (req, res) => {
  try {
    const { teacherId, adminId } = req.params;

    // Fetch syllabus data where the assigned teacher and admin match
    const syllabi = await Syllabus.find({ teacherId, adminId }).sort({ createdAt: -1 });

    if (!syllabi || syllabi.length === 0) {
      return res.status(404).json({ message: "No syllabus found for this teacher." });
    }

    res.json(syllabi);
  } catch (error) {
    console.error("Error fetching syllabus data:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Fetch a syllabus file by ID
router.get("/files/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const syllabus = await Syllabus.findOne({ fileId });

    if (!syllabus || !syllabus.fileUrl) {
      return res.status(404).json({ message: "File not found." });
    }

    res.redirect(syllabus.fileUrl);
  } catch (error) {
    console.error("Error fetching file:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

module.exports = router;