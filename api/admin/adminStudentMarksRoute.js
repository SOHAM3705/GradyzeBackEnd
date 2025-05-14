const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Student = require("../../models/studentModel");
const Teacher = require("../../models/teacheraccount");
const TeacherMarks = require("../../models/marksschema");

router.get('/fetchmarks', async (req, res) => {
  try {
    const { adminId, department, year, division, examType } = req.query;
    
    if (!adminId || !department || !year || !division || !examType) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Convert examType to match schema enum values
    // Your schema uses 'unit-test', 're-unit-test', 'prelim', 're-prelim'
    // But your frontend sends 'unitTest', 'reunitTest', 'prelims', 'reprelims'
    const examTypeMap = {
      'unitTest': 'unit-test',
      'reunitTest': 're-unit-test',
      'prelims': 'prelim',
      'reprelims': 're-prelim'
    };
    
    const formattedExamType = examTypeMap[examType];
    
    if (!formattedExamType) {
      return res.status(400).json({ error: 'Invalid exam type' });
    }
    
    // Find students with proper filtering
    const students = await Student.find({
      adminId: new mongoose.Types.ObjectId(adminId),
      year,
      division
    }).select('rollNo name _id').lean();
    
    if (students.length === 0) {
      return res.status(404).json({ error: 'No students found for this class' });
    }
    
    // Get marks with proper formatting
    const marksData = await TeacherMarks.find({
      studentId: { $in: students.map(s => s._id) },
      examType: formattedExamType,
      year: year
    }).lean();
    
    console.log(`Found ${marksData.length} mark entries for exam type: ${formattedExamType}`);
    
    // Map results to students, ensuring we handle string comparison correctly for ObjectIds
    const result = students.map(student => {
      const studentMarks = marksData.find(m => 
        m.studentId.toString() === student._id.toString()
      );
      
      return {
        rollNo: student.rollNo,
        name: student.name,
        marks: studentMarks ? studentMarks.overallMarks : null,
        examDetails: studentMarks ? studentMarks.exams : []
      };
    });
    
    res.status(200).json({ marksData: result });
  } catch (error) {
    console.error('Error fetching marks:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;