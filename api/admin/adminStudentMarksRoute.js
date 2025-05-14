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
const TeacherMarks = require("../../models/marksschema");

router.get('/fetchmarks', async (req, res) => {
  try {
    const { adminId, department, year, division, examType } = req.query;

    if (!adminId || !department || !year || !division || !examType) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Find teacher with proper population
    const teacher = await Teacher.findOne({
      adminId: new mongoose.Types.ObjectId(adminId),
      department,
      'assignedClass.year': year,
      'assignedClass.division': division
    }).lean();

    if (!teacher) {
      return res.status(404).json({ error: 'No teacher found for this class' });
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

    // Get marks with proper population
    const marksData = await TeacherMarks.aggregate([
      {
        $match: {
          studentId: { $in: students.map(s => s._id) },
          examType,
          year
        }
      },
      {
        $project: {
          studentId: 1,
          overallMarks: 1,
          examType: 1,
          year: 1,
          exams: 1
        }
      }
    ]);

    // Map results to students
    const result = students.map(student => {
      const studentMarks = marksData.find(m => m.studentId.equals(student._id));
      return {
        rollNo: student.rollNo,
        name: student.name,
        marks: studentMarks?.overallMarks || 0,
        exams: studentMarks?.exams || []
      };
    });

    res.status(200).json({ marksData: result });
  } catch (error) {
    console.error('Error fetching marks:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});


module.exports = router;
