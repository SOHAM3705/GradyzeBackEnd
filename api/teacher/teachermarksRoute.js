const express = require("express");
const router = express.Router();
const Teacher = require("../../models/teacheraccount");
const Student = require("../../models/studentModel");
const Marks = require("../../models/marksschema");
const mongoose = require('mongoose');

// Get assigned divisions for a class teacher
router.get("/:teacherId/divisions", async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Find the teacher who is a class teacher
    const teacher = await Teacher.findOne({
      _id: teacherId,
      isClassTeacher: true,
    });

    if (!teacher) {
      return res.status(404).json({ message: "Class teacher not found" });
    }

    // Return the assigned class (year & division)
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

    // Find the teacher who is a class teacher
    const teacher = await Teacher.findOne({
      _id: teacherId,
      isClassTeacher: true,
    });

    if (!teacher) {
      return res.status(404).json({ message: "Class teacher not found" });
    }

    // Extract assigned division and year
    const { year, division } = teacher.assignedClass;

    // Find subjects that belong to the same year and division
    const assignedSubjects = teacher.subjects.filter(
      (subject) => subject.year === year && subject.division === division
    );

    res.json({ year, division, subjects: assignedSubjects });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get subjects assigned to a class teacher's division based on exam type & status
router.get("/:teacherId/exams", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { examType, status } = req.query; // Status and exam type from request

    // Find the class teacher
    const teacher = await Teacher.findOne({
      _id: teacherId,
      isClassTeacher: true,
    });

    if (!teacher) {
      return res.status(404).json({ message: "Class teacher not found" });
    }

    const { year, division } = teacher.assignedClass;

    // Get all subjects for the teacher's assigned class
    const assignedSubjects = teacher.subjects.filter(
      (subject) => subject.year === year && subject.division === division
    );

    // Fetch marks data that matches the given exam type & status
    const marksData = await Marks.find({
      teacherId,
      academicYear: year,
      "exams.examType": examType,
    });

    // Extract subjects that have marks recorded for the given exam type
    const subjectsWithExam = marksData.flatMap((entry) =>
      entry.exams
        .filter((exam) => exam.examType === examType)
        .flatMap((exam) => exam.subjects.map((sub) => sub.subjectName))
    );

    // Filter assigned subjects that match the recorded subjects
    const filteredSubjects = assignedSubjects.filter((subject) =>
      subjectsWithExam.includes(subject.name)
    );

    res.json({ year, division, subjects: filteredSubjects, examType, status });
  } catch (error) {
    console.error("Error fetching subjects for exams:", error);
    res.status(500).json({ message: "Server error" });
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

// Get students in teacher's assigned class
router.get("/:teacherId/students", async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Find the class teacher
    const teacher = await Teacher.findOne({
      _id: teacherId,
      isClassTeacher: true,
    });

    if (!teacher) {
      return res.status(404).json({ message: "Class teacher not found" });
    }

    const { year, division } = teacher.assignedClass;

    // Fetch students who belong to the same year & division
    const students = await Student.find({ year, division });

    res.json({ year, division, students });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/subject-list/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    console.log("Received teacherId:", teacherId);

    const teacher = await Teacher.findById(teacherId);
    console.log("Found Teacher:", teacher);

    if (!teacher || !teacher.isSubjectTeacher) {
      return res.status(404).json({ message: "Subject Teacher not found" });
    }

    console.log("Subjects of Teacher:", teacher.subjects); // ✅ Debugging
    res.json({ subjects: teacher.subjects || [] });
  } catch (error) {
    console.error("Error fetching subject details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get('/:teacherId/student/:studentId', async (req, res) => {
  try {
    const { teacherId, studentId } = req.params;

    // Find the student
    const student = await Student.findById(studentId)
      .populate('teacherId', 'name department');

    // Verify teacher's access
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(403).json({ message: 'Teacher not found' });
    }

    // Check if the teacher has access to this student's division
    if (teacher.isClassTeacher && teacher.assignedClass.division !== student.division) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Fetch student's marks
    const studentMarks = await Marks.findOne({ 
      studentId: studentId,
      teacherId: teacherId
    });

    // Prepare detailed student performance data
    const performanceDetails = {
      _id: student._id,
      name: student.name,
      rollNo: student.rollNo,
      division: student.division,
      year: student.year,
      teacher: {
        name: student.teacherId.name,
        department: student.teacherId.department
      },
      exams: studentMarks ? studentMarks.exams.map(exam => ({
        examType: exam.examType,
        subjects: exam.subjects.map(subject => ({
          subjectName: subject.subjectName,
          marksObtained: subject.marksObtained,
          totalMarks: subject.totalMarks,
          percentage: Math.round((subject.marksObtained / subject.totalMarks) * 100)
        }))
      })) : []
    };

    res.json(performanceDetails);
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API endpoint to fetch marks for a specific teacher's subject
router.get('/:teacherId/subject/:subjectName/students', 
  async (req, res) => {
      try {
          const { teacherId, subjectName } = req.params;

          // Validate teacher exists
          const teacher = await Teacher.findById(teacherId);
          if (!teacher) {
              return res.status(404).json({ message: 'Teacher not found' });
          }

          // Find students for the teacher
          const students = await Student.find({ 
              teacherId: new mongoose.Types.ObjectId(teacherId) 
          }).select('_id name rollNo email');

          // Fetch marks for these students
          const marksData = await Marks.find({
              teacherId: new mongoose.Types.ObjectId(teacherId),
              'exams.subjects.subjectName': subjectName
          });

          // Process marks data
          const examData = {};
          students.forEach(student => {
              const studentMarks = marksData.find(
                  mark => mark.studentId.toString() === student._id.toString()
              );

              if (studentMarks) {
                  studentMarks.exams.forEach(exam => {
                      const subjectMarks = exam.subjects.find(
                          subject => subject.subjectName === subjectName
                      );

                      if (subjectMarks) {
                          if (!examData[student._id]) {
                              examData[student._id] = {};
                          }
                          examData[student._id][exam.examType] = {
                              marksObtained: subjectMarks.marksObtained,
                              totalMarks: subjectMarks.totalMarks
                          };
                      }
                  });
              }
          });

          res.json({
              students: students.map(student => ({
                  id: student._id,
                  name: student.name,
                  rollNo: student.rollNo,
                  email: student.email
              })),
              examData: examData
          });

      } catch (error) {
          console.error('Error fetching subject students marks:', error);
          res.status(500).json({ 
              message: 'Error fetching subject students marks', 
              error: error.message 
          });
      }
  }
);

// Get student marks for a specific exam type
router.get("/:teacherId/marks", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { examType } = req.query; // Exam type from request

    // Find the class teacher
    const teacher = await Teacher.findOne({
      _id: teacherId,
      isClassTeacher: true,
    });

    if (!teacher) {
      return res.status(404).json({ message: "Class teacher not found" });
    }

    const { year, division } = teacher.assignedClass;

    // Fetch students who belong to the same year & division
    const students = await Student.find({ year, division }).select("_id name rollNo");

    // Fetch marks data for students in this division and exam type
    const marksData = await Marks.find({
      studentId: { $in: students.map((s) => s._id) },
      academicYear: year,
      "exams.examType": examType,
    });

    // Format response with student marks
    const studentMarks = students.map((student) => {
      const studentMarksEntry = marksData.find((m) => m.studentId.toString() === student._id.toString());

      return {
        rollNo: student.rollNo,
        name: student.name,
        marks: studentMarksEntry
          ? studentMarksEntry.exams
              .filter((exam) => exam.examType === examType)
              .flatMap((exam) => exam.subjects)
          : [],
      };
    });

    res.json({ year, division, examType, studentMarks });
  } catch (error) {
    console.error("Error fetching student marks:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/teachermarks/:teacherId/batches", async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // Assuming batches are linked to the teacher in the database
    const teacher = await Teacher.findById(teacherId).populate("batches");

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.json({ batches: teacher.batches || [] });
  } catch (error) {
    console.error("Error fetching batches:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add or update student marks
router.post("/:teacherId/marks", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { studentId, examType, subjectName, marksObtained, totalMarks, academicYear } = req.body;

    if (!studentId || !examType || !subjectName || marksObtained == null || !totalMarks || !academicYear) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if marks entry exists for this student & academic year
    let marksEntry = await Marks.findOne({ studentId, academicYear });

    if (!marksEntry) {
      // Create new marks entry
      marksEntry = new Marks({
        studentId,
        teacherId,
        academicYear,
        exams: [
          {
            examType,
            subjects: [{ subjectName, marksObtained, totalMarks }],
          },
        ],
      });
    } else {
      // Update existing marks entry
      let exam = marksEntry.exams.find((e) => e.examType === examType);
      if (!exam) {
        marksEntry.exams.push({ examType, subjects: [{ subjectName, marksObtained, totalMarks }] });
      } else {
        let subject = exam.subjects.find((s) => s.subjectName === subjectName);
        if (subject) {
          subject.marksObtained = marksObtained;
          subject.totalMarks = totalMarks;
        } else {
          exam.subjects.push({ subjectName, marksObtained, totalMarks });
        }
      }
    }

    await marksEntry.save();
    res.json({ message: "Marks added/updated successfully" });
  } catch (error) {
    console.error("Error updating marks:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete student marks for a specific exam type and subject
router.delete("/:teacherId/marks/:studentId", async (req, res) => {
  try {
    const { teacherId, studentId } = req.params;
    const { examType, subjectName, academicYear } = req.body;

    if (!examType || !subjectName || !academicYear) {
      return res.status(400).json({ message: "Exam type, subject name, and academic year are required" });
    }

    // Find the student's marks entry
    let marksEntry = await Marks.findOne({ studentId, academicYear });

    if (!marksEntry) {
      return res.status(404).json({ message: "Marks record not found" });
    }

    // Find the specific exam
    let exam = marksEntry.exams.find((e) => e.examType === examType);
    if (!exam) {
      return res.status(404).json({ message: "Exam type not found" });
    }

    // Remove the subject from the exam
    exam.subjects = exam.subjects.filter((s) => s.subjectName !== subjectName);

    // If no subjects left in the exam, remove the exam entry
    marksEntry.exams = marksEntry.exams.filter((e) => e.subjects.length > 0);

    // If no exams left, delete the entire marks document
    if (marksEntry.exams.length === 0) {
      await Marks.deleteOne({ _id: marksEntry._id });
      return res.json({ message: "All marks for this student have been deleted" });
    }

    // Save updated marks entry
    await marksEntry.save();
    res.json({ message: "Marks deleted successfully" });
  } catch (error) {
    console.error("Error deleting marks:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get class teacher dashboard details
router.get("/dashboard/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Find the class assigned to the teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.isClassTeacher) {
      return res.status(403).json({ message: "Unauthorized or not a class teacher" });
    }

    const { year, division } = teacher.assignedClass;

    // Fetch all students in the class
    const students = await Student.find({ year, division });

    // Fetch marks for these students
    const studentIds = students.map((s) => s._id);
    const marks = await Marks.find({ studentId: { $in: studentIds } });

    let subjectPerformance = {};
    let examPerformance = {};
    let studentSummary = [];

    students.forEach((student) => {
      let studentMarks = marks.find((m) => m.studentId.toString() === student._id.toString());
      let totalMarks = 0;
      let totalSubjects = 0;

      if (studentMarks) {
        studentMarks.exams.forEach((exam) => {
          examPerformance[exam.examType] = examPerformance[exam.examType] || { totalMarks: 0, count: 0 };
          
          exam.subjects.forEach((subject) => {
            subjectPerformance[subject.subjectName] = subjectPerformance[subject.subjectName] || { totalMarks: 0, count: 0 };
            subjectPerformance[subject.subjectName].totalMarks += subject.marksObtained;
            subjectPerformance[subject.subjectName].count++;

            examPerformance[exam.examType].totalMarks += subject.marksObtained;
            examPerformance[exam.examType].count++;

            totalMarks += subject.marksObtained;
            totalSubjects++;
          });
        });
      }

      let avgMarks = totalSubjects ? totalMarks / totalSubjects : 0;
      studentSummary.push({ studentId: student._id, name: student.name, avgMarks });
    });

    // Calculate averages
    for (let subject in subjectPerformance) {
      subjectPerformance[subject].avgMarks = subjectPerformance[subject].totalMarks / subjectPerformance[subject].count;
    }

    for (let exam in examPerformance) {
      examPerformance[exam].avgMarks = examPerformance[exam].totalMarks / examPerformance[exam].count;
    }

    // Sort students by performance
    studentSummary.sort((a, b) => b.avgMarks - a.avgMarks);

    res.json({
      totalStudents: students.length,
      subjectPerformance,
      examPerformance,
      topStudents: studentSummary.slice(0, 3),
      lowPerformingStudents: studentSummary.slice(-3)
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Route to fetch subjects assigned (for Subject Teacher)
router.get("/subjects-list/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Find teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.isSubjectTeacher) {
      return res.status(404).json({ message: "Subject Teacher not found" });
    }

    res.json({
      subjects: teacher.subjects, // Returns all assigned subjects
    });
  } catch (error) {
    console.error("Error fetching subject details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
module.exports = router;