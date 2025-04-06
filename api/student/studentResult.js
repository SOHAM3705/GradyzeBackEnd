const express = require('express');
const router = express.Router();
const TeacherMarks = require('../../models/marksschema');

// GET: Fetch marks by studentId
router.get('/marks/:studentId', async (req, res) => {
  const { studentId } = req.params;

  try {
    const marksData = await TeacherMarks.find({ studentId })
      .populate('studentId', 'name email')
      .populate('teacherId', 'name email department'); // No 'exams.'

    if (!marksData || marksData.length === 0) {
      return res.status(404).json({ message: 'No marks found for this student' });
    }

    res.status(200).json({ success: true, data: marksData });

  } catch (error) {
    console.error('Error fetching student marks:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
