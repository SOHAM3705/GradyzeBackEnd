const express = require('express');
const multer = require("multer");
const mongoose = require('mongoose');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { GridFSBucket } = require('mongodb');
const Student = require("../../models/studentModel"); 
const Teacher = require("../../models/teacheraccont");
const Admin = require("../../models/useradmin");

router.get('/fetchstudents', async (req, res) => {
    try {
      const { adminId, department, year, division } = req.query;
  
      // Ensure all required parameters are provided
      if (!adminId || !department || !year || !division) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
  
      // Fetch the teacher associated with the given department, year, and division
      const teacher = await Teacher.findOne({
        adminId: mongoose.Types.ObjectId(adminId),
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
  
      // Return the list of students
      res.status(200).json({ students });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });
  
  module.exports = router;