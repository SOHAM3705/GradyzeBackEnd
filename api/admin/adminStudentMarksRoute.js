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

    const teacher = await Teacher.findOne({
      adminId: new mongoose.Types.ObjectId(adminId),
      department,
      'assignedClass.year': year,
      'assignedClass.division': division
    });

    if (!teacher) {
      return res.status(404).json({ error: 'No teacher found for this class' });
    }

    const students = await Student.find({ 
      teacherId: teacher._id, 
      adminId,
      year,
      division
    }).select('rollNo name');

    if (students.length === 0) {
      return res.status(404).json({ error: 'No students found for this class' });
    }

    const marksPromises = students.map(async (student) => {
      const marksDoc = await TeacherMarks.findOne({
        studentId: student._id,
        examType
      });
    
    
      return {
        rollNo: student.rollNo,
        name: student.name,
        marks: marksDoc?.overallMarks || 0
      };
    });

    const marksData = await Promise.all(marksPromises);

    res.status(200).json({ marksData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});



module.exports = router;
