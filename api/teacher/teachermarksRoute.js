const express = require("express");
const router = express.Router();
const Teacher = require("../../models/teacheraccount");
const Student = require("../../models/studentModel");
const Marks = require("../../models/marksschema");
const Subject = require("../../models/subjectModel");
const mongoose = require('mongoose');

// Get assigned divisions for a class teacher
router.get("/:teacherId/divisions", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findOne({
      _id: teacherId,
      isClassTeacher: true,
    });

    if (!teacher) {
      return res.status(404).json({ message: "Class teacher not found" });
    }

    res.json({
      year: teacher.assignedClass.year,
      division: teacher.assignedClass.division,
    });
  } catch (error) {
    console.error("Error fetching class teacher divisions:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get subjects assigned to a class teacher's division
router.get("/:teacherId/subjects", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findOne({
      _id: teacherId,
      isClassTeacher: true,
    });

    if (!teacher) {
      return res.status(404).json({ message: "Class teacher not found" });
    }

    const { year, division } = teacher.assignedClass;
    const assignedSubjects = teacher.subjects.filter(
      (subject) => subject.year === year && subject.division === division
    );

    res.json({ year, division, subjects: assignedSubjects });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get students by subject for subject teacher
router.get("/students-by-subject/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findById(teacherId);
    
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    if (!teacher.isSubjectTeacher) {
      return res.status(403).json({ message: "Not authorized to fetch students" });
    }

    const studentData = {};
    for (const subject of teacher.subjects) {
      if (!subject.year || !subject.division) continue;

      const key = `${subject.year}-${subject.division}`;
      if (!studentData[key]) {
        studentData[key] = await Student.find({
          year: subject.year,
          division: subject.division,
        });
      }
    }

    res.status(200).json({ subjects: teacher.subjects, studentData });
  } catch (error) {
    console.error("Error fetching students for subjects:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get teacher role details
router.get("/teacher-role/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
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

// Get students in teacher's assigned class
router.get("/:teacherId/students", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findOne({
      _id: teacherId,
      isClassTeacher: true,
    });

    if (!teacher) {
      return res.status(404).json({ message: "Class teacher not found" });
    }

    const { year, division } = teacher.assignedClass;
    const students = await Student.find({ year, division });
    res.json({ year, division, students });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get subject list for teacher
router.get("/subject-list/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findById(teacherId);
    
    if (!teacher || !teacher.isSubjectTeacher) {
      return res.status(404).json({ message: "Subject Teacher not found" });
    }

    res.json({ subjects: teacher.subjects || [] });
  } catch (error) {
    console.error("Error fetching subject details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get student performance details
router.get('/:teacherId/student/:studentId', async (req, res) => {
  try {
    const { teacherId, studentId } = req.params;
    const student = await Student.findById(studentId).populate('teacherId', 'name department');
    const teacher = await Teacher.findById(teacherId);

    if (!teacher) return res.status(403).json({ message: 'Teacher not found' });
    if (teacher.isClassTeacher && teacher.assignedClass.division !== student.division) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const studentMarks = await Marks.find({ studentId });
    const performanceDetails = {
      student: {
        _id: student._id,
        name: student.name,
        rollNo: student.rollNo,
        division: student.division,
        year: student.year,
        teacher: {
          name: student.teacherId.name,
          department: student.teacherId.department
        }
      },
      exams: studentMarks.map(record => ({
        examType: record.examType,
        year: record.year,
        subjects: record.exams.map(exam => ({
          subjectName: exam.subjectName,
          subjectId: exam.subjectId,
          marksObtained: exam.status === "Absent" ? "Absent" : exam.marksObtained,
          totalMarks: exam.status === "Absent" ? "Absent" : exam.totalMarks,
          percentage: exam.status === "Absent" ? "Absent" : 
            Math.round((exam.marksObtained.total / exam.totalMarks) * 100),
          status: exam.status,
          dateAdded: exam.dateAdded
        }))
      }))
    };

    res.json(performanceDetails);
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add marks with absent support
router.post("/add-marks", async (req, res) => {
  try {
    const { studentId, teacherId, examType, year, subjectName, subjectId, isAbsent, marks } = req.body;

    if (!studentId || !teacherId || !examType || !year || !subjectName || !subjectId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const marksEntry = {
      subjectName,
      subjectId,
      teacherId,
      ...(isAbsent ? {
        marksObtained: { q1q2: -1, q3q4: 0, q5q6: 0, q7q8: 0, total: -1 },
        totalMarks: 0,
        status: "Absent"
      } : {
        marksObtained: {
          q1q2: marks.q1q2,
          q3q4: marks.q3q4,
          q5q6: marks.q5q6,
          q7q8: marks.q7q8,
          total: marks.q1q2 + marks.q3q4 + marks.q5q6 + marks.q7q8
        },
        totalMarks: examType.includes('unit') ? 30 : 70,
        status: (marks.q1q2 + marks.q3q4 + marks.q5q6 + marks.q7q8) >= 
                (examType.includes('unit') ? 12 : 28) ? "Pass" : "Fail"
      })
    };

    let record = await Marks.findOne({ studentId, examType, year });
    if (record) {
      const examIndex = record.exams.findIndex(e => e.subjectId.equals(subjectId));
      if (examIndex >= 0) {
        record.exams[examIndex] = marksEntry;
      } else {
        record.exams.push(marksEntry);
      }
    } else {
      record = new Marks({ studentId, examType, year, exams: [marksEntry] });
    }

    await record.save();
    res.status(201).json({ message: "Marks saved successfully" });
  } catch (error) {
    console.error("Add Marks Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update marks with absent support
router.put("/update-marks/:recordId", async (req, res) => {
  try {
    const { recordId } = req.params;
    const { subjectId, isAbsent, marks } = req.body;

    const record = await Marks.findById(recordId);
    if (!record) return res.status(404).json({ message: "Record not found" });

    const examIndex = record.exams.findIndex(e => e.subjectId.equals(subjectId));
    if (examIndex === -1) return res.status(404).json({ message: "Subject not found" });

    record.exams[examIndex] = {
      ...record.exams[examIndex],
      ...(isAbsent ? {
        marksObtained: { q1q2: -1, q3q4: 0, q5q6: 0, q7q8: 0, total: -1 },
        status: "Absent"
      } : {
        marksObtained: {
          q1q2: marks.q1q2,
          q3q4: marks.q3q4,
          q5q6: marks.q5q6,
          q7q8: marks.q7q8,
          total: marks.q1q2 + marks.q3q4 + marks.q5q6 + marks.q7q8
        },
        status: (marks.q1q2 + marks.q3q4 + marks.q5q6 + marks.q7q8) >= 
                (record.examType.includes('unit') ? 12 : 28) ? "Pass" : "Fail"
      }),
      dateAdded: record.exams[examIndex].dateAdded
    };

    await record.save();
    res.status(200).json({ message: "Marks updated successfully" });
  } catch (error) {
    console.error("Update Marks Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete marks for a subject
router.delete("/delete-marks/:recordId", async (req, res) => {
  try {
    const { recordId } = req.params;
    const { subjectId } = req.body;

    const record = await Marks.findById(recordId);
    if (!record) return res.status(404).json({ message: "Record not found" });

    record.exams = record.exams.filter(exam => !exam.subjectId.equals(subjectId));
    
    if (record.exams.length === 0) {
      await Marks.findByIdAndDelete(recordId);
    } else {
      await record.save();
    }

    res.status(200).json({ message: "Marks deleted successfully" });
  } catch (error) {
    console.error("Delete Marks Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get marks for a student
router.get("/student-marks/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { examType, year } = req.query;

    const query = { studentId };
    if (examType) query.examType = examType;
    if (year) query.year = year;

    const records = await Marks.find(query);
    if (!records.length) return res.status(404).json({ message: "No marks found" });

    res.status(200).json(records.map(record => ({
      _id: record._id,
      examType: record.examType,
      year: record.year,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      exams: record.exams.map(exam => ({
        subjectId: exam.subjectId,
        subjectName: exam.subjectName,
        marks: exam.status === "Absent" ? "Absent" : {
          breakdown: exam.marksObtained,
          total: exam.marksObtained.total,
          outOf: exam.totalMarks,
          percentage: Math.round((exam.marksObtained.total / exam.totalMarks) * 100)
        },
        status: exam.status,
        dateAdded: exam.dateAdded
      }))
    })));
  } catch (error) {
    console.error("Fetch Marks Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;