const express = require("express");
const Marks = require("../../models/marksschema");
const Student = require("../../models/studentModel");
const Teacher = require("../../models/teacheraccount");

const router = express.Router();

// Middleware to check teacher role
async function checkTeacherRole(req, res, next) {
  try {
    // ✅ Extract token from headers
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ error: "Unauthorized: No token provided" });

    // ✅ Verify token
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    if (!decoded.id) return res.status(401).json({ error: "Invalid token" });

    // ✅ Fetch teacher from database
    const teacher = await Teacher.findById(decoded.id);
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    req.teacher = teacher;
    next();
  } catch (error) {
    console.error("Authentication Error:", error);
    res.status(500).json({ error: "Error verifying teacher" });
  }
}
// Fetch students based on class teacher's assigned class
router.get("/students", checkTeacherRole, async (req, res) => {
  try {
    const { year, division, semester } = req.teacher.assignedClass; // ✅ Use teacher's assigned class

    const students = await Student.find({ year, division, semester });

    res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
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

    // ✅ Ensure the teacher is allowed to assign marks for this subject
    const subjectExists = req.teacher.subjects.some(sub => sub.name === subject && sub.semester === semester);
    if (!subjectExists) {
      return res.status(403).json({ error: "Not authorized to assign marks for this subject" });
    }

    const newMarks = new Marks({
      studentId,
      teacherId: req.teacher._id,
      subject,
      marksObtained,
      totalMarks,
      examType,
      semester
    });

    await newMarks.save();
    res.status(201).json({ message: "Marks added successfully" });
  } catch (error) {
    console.error("Error adding marks:", error);
    res.status(500).json({ error: "Failed to add marks" });
  }
});

// Get marks for a student (Visible only to respective teachers)
router.get("/student-marks/:studentId", checkTeacherRole, async (req, res) => {
  try {
    const studentMarks = await Marks.find({ studentId: req.params.studentId });

    // ✅ Allow access if the teacher is either a class teacher or subject teacher
    if (
      req.teacher.isClassTeacher ||
      req.teacher.subjects.some(subject => studentMarks.some(mark => mark.subject === subject.name))
    ) {
      return res.status(200).json(studentMarks);
    }

    return res.status(403).json({ error: "Not authorized to view marks" });
  } catch (error) {
    console.error("Error fetching marks:", error);
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
    if (!marks) return res.status(404).json({ error: "Marks not found" });

    // ✅ Ensure the teacher is only deleting marks they assigned
    if (marks.teacherId.toString() !== req.teacher._id.toString()) {
      return res.status(403).json({ error: "Not authorized to delete these marks" });
    }

    await Marks.findByIdAndDelete(req.params.marksId);
    res.status(200).json({ message: "Marks deleted successfully" });
  } catch (error) {
    console.error("Error deleting marks:", error);
    res.status(500).json({ error: "Error deleting marks" });
  }
});

// Route to get teacher role details
router.get("/teacher-role/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Fetch teacher details from database
    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.json({
      isClassTeacher: teacher.isClassTeacher,
      isSubjectTeacher: teacher.isSubjectTeacher,
    });
  } catch (error) {
    console.error("Error fetching teacher role:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
