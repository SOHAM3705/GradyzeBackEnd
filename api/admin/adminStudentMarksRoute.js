const express = require('express');
const multer = require("multer");
const mongoose = require('mongoose');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { GridFSBucket } = require('mongodb');
const Student = require("../../models/studentModel"); 
const Teacher = require("../../models/teacheraccount");
const Admin = require("../../models/useradmin");
const TeacherMarks = require("../../models.marksschema");

router.get('/fetchmarks', async (req, res) => {
  try {
    const { adminId, department, year, division, examType } = req.query;

    // Ensure all required parameters are provided
    if (!adminId || !department || !year || !division || !examType) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Fetch the teacher associated with the given department, year, and division
    const teacher = await Teacher.findOne({
      adminId: new mongoose.Types.ObjectId(adminId),
      department: department,
      'assignedClass.year': year,
      'assignedClass.division': division
    });

    if (!teacher) {
      return res.status(404).json({ error: 'No teacher found for this class' });
    }

    // Fetch students associated with this teacher and class
    const students = await Student.find({ 
      teacherId: teacher._id, 
      adminId: adminId,
      year: year,
      division: division
    }).select('rollNo name email');

    if (students.length === 0) {
      return res.status(404).json({ error: 'No students found for this class' });
    }

    // Fetch marks for each student based on the examType
    const marksPromises = students.map(async (student) => {
      const marks = await TeacherMarks.findOne({
        studentId: student._id,
        examType: examType,  // Exam type can be unitTest, reunitTest, prelims, etc.
      });

      return {
        rollNo: student.rollNo,
        name: student.name,
        marks: marks ? marks.marks : null  // Marks for the exam type, or null if not found
      };
    });

    const marksData = await Promise.all(marksPromises);

    // Return the list of students with their marks
    res.status(200).json({ marksData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
