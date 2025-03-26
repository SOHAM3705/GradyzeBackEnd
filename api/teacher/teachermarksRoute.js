const express = require("express");
const Marks = require("../../models/marksschema");
const Student = require("../../models/studentModel");
const Teacher = require("../../models/teacheraccount");

const router = express.Router();

// Middleware to check teacher role
async function checkTeacherRole(req, res, next) {
  try {
    const teacher = await Teacher.findById(req.body.teacherId);
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });
    req.teacher = teacher;
    next();
  } catch (error) {
    res.status(500).json({ error: "Error verifying teacher" });
  }
}

// Fetch students based on class teacher's assigned class
router.get("/students", checkTeacherRole, async (req, res) => {
  try {
    const { year, division, semester } = req.query;
    if (req.teacher.isClassTeacher) {
      if (req.teacher.assignedClass.year !== year ||
          req.teacher.assignedClass.division !== division ||
          req.teacher.assignedClass.semester !== semester) {
        return res.status(403).json({ error: "Not authorized to access this class" });
      }
    }
    const students = await Student.find({ year, division, semester });
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ error: "Error fetching students" });
  }
});

// Add marks (Restricted to Subject Teachers)
router.post("/add-marks", checkTeacherRole, async (req, res) => {
  try {
    if (!req.teacher.isSubjectTeacher) {
      return res.status(403).json({ error: "Not authorized to assign marks" });
    }
    const { studentId, subject, marksObtained, totalMarks, examType, semester } = req.body;
    const subjectExists = req.teacher.subjects.some(sub => sub.name === subject && sub.semester === semester);
    if (!subjectExists) {
      return res.status(403).json({ error: "Not authorized to assign marks for this subject" });
    }
    const newMarks = new Marks({ studentId, teacherId: req.teacher._id, subject, marksObtained, totalMarks, examType, semester });
    await newMarks.save();
    res.status(201).json({ message: "Marks added successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to add marks" });
  }
});

// Get marks for a student (Visible only to respective teachers)
router.get("/student-marks/:studentId", checkTeacherRole, async (req, res) => {
  try {
    const studentMarks = await Marks.find({ studentId: req.params.studentId });
    if (!req.teacher.isClassTeacher && !req.teacher.isSubjectTeacher) {
      return res.status(403).json({ error: "Not authorized to view marks" });
    }
    res.status(200).json(studentMarks);
  } catch (error) {
    res.status(500).json({ error: "Error fetching marks" });
  }
});

// Update marks (Only Subject Teachers can update their assigned subject's marks)
router.put("/update-marks/:marksId", checkTeacherRole, async (req, res) => {
  try {
    if (!req.teacher.isSubjectTeacher) {
      return res.status(403).json({ error: "Not authorized to update marks" });
    }
    const marks = await Marks.findById(req.params.marksId);
    if (!marks || marks.teacherId.toString() !== req.teacher._id.toString()) {
      return res.status(403).json({ error: "Not authorized to update these marks" });
    }
    const updatedMarks = await Marks.findByIdAndUpdate(req.params.marksId, req.body, { new: true });
    res.status(200).json(updatedMarks);
  } catch (error) {
    res.status(500).json({ error: "Error updating marks" });
  }
});

// Delete marks (Only Subject Teachers can delete their own assigned marks)
router.delete("/delete-marks/:marksId", checkTeacherRole, async (req, res) => {
  try {
    if (!req.teacher.isSubjectTeacher) {
      return res.status(403).json({ error: "Not authorized to delete marks" });
    }
    const marks = await Marks.findById(req.params.marksId);
    if (!marks || marks.teacherId.toString() !== req.teacher._id.toString()) {
      return res.status(403).json({ error: "Not authorized to delete these marks" });
    }
    await Marks.findByIdAndDelete(req.params.marksId);
    res.status(200).json({ message: "Marks deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting marks" });
  }
});

module.exports = router;
