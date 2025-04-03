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

    const subjects = teacher.subjects;
    if (!Array.isArray(subjects)) {
      return res.status(400).json({ message: "Assigned subjects are not defined or not an array" });
    }

    const studentData = {};
    for (const subject of subjects) {
      if (!subject.year || !subject.division) {
        console.error("Subject missing year or division:", subject);
        continue;
      }

      const key = `${subject.year}-${subject.division}`;
      if (!studentData[key]) {
        studentData[key] = [];
      }

      const students = await Student.find({
        year: subject.year,
        division: subject.division,
      });

      studentData[key].push(...students);
    }

    res.status(200).json({ subjects, studentData });
  } catch (error) {
    console.error("Error fetching students for subjects:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get subjects assigned to a class teacher's division based on exam type & status
router.get("/:teacherId/exams", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { examType, status } = req.query;

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

    const marksData = await Marks.find({
      teacherId,
      academicYear: year,
      "exams.examType": examType,
    });

    const subjectsWithExam = marksData.flatMap((entry) =>
      entry.exams
        .filter((exam) => exam.examType === examType)
        .flatMap((exam) => exam.subjects.map((sub) => sub.subjectName))
    );

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

router.get('/:teacherId/student/:studentId', async (req, res) => {
  try {
    const { teacherId, studentId } = req.params;

    const student = await Student.findById(studentId)
      .populate('teacherId', 'name department');

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(403).json({ message: 'Teacher not found' });
    }

    if (teacher.isClassTeacher && teacher.assignedClass.division !== student.division) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const studentMarks = await Marks.findOne({
      studentId: studentId,
      teacherId: teacherId
    });

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
          marksObtained: subject.status === "Absent" ? "Absent" : subject.marksObtained,
          totalMarks: subject.status === "Absent" ? "Absent" : subject.totalMarks,
          percentage: subject.status === "Absent" ? "Absent" : Math.round((subject.marksObtained / subject.totalMarks) * 100)
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

          const teacher = await Teacher.findById(teacherId);
          if (!teacher) {
              return res.status(404).json({ message: 'Teacher not found' });
          }

          const students = await Student.find({
              teacherId: new mongoose.Types.ObjectId(teacherId)
          }).select('_id name rollNo email');

          const marksData = await Marks.find({
              teacherId: new mongoose.Types.ObjectId(teacherId),
              'exams.subjects.subjectName': subjectName
          });

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
                              marksObtained: subjectMarks.status === "Absent" ? "Absent" : subjectMarks.marksObtained,
                              totalMarks: subjectMarks.status === "Absent" ? "Absent" : subjectMarks.totalMarks
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
    const { examType } = req.query;

    const teacher = await Teacher.findOne({
      _id: teacherId,
      isClassTeacher: true,
    });

    if (!teacher) {
      return res.status(404).json({ message: "Class teacher not found" });
    }

    const { year, division } = teacher.assignedClass;

    const students = await Student.find({ year, division }).select("_id name rollNo");

    const marksData = await Marks.find({
      studentId: { $in: students.map((s) => s._id) },
      academicYear: year,
      "exams.examType": examType,
    });

    const studentMarks = students.map((student) => {
      const studentMarksEntry = marksData.find((m) => m.studentId.toString() === student._id.toString());

      return {
        rollNo: student.rollNo,
        name: student.name,
        marks: studentMarksEntry
          ? studentMarksEntry.exams
              .filter((exam) => exam.examType === examType)
              .flatMap((exam) => exam.subjects.map(subject => ({
                subjectName: subject.subjectName,
                marksObtained: subject.status === "Absent" ? "Absent" : subject.marksObtained,
                totalMarks: subject.status === "Absent" ? "Absent" : subject.totalMarks,
              })))
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

// Add Marks (Create)
router.post("/add", async (req, res) => {
  try {
    const { teacherId, studentId, academicYear, examType, subjectName, marksObtained, totalMarks, status } = req.body;

    if (!teacherId || !studentId || !academicYear || !examType || !subjectName || marksObtained === undefined || !totalMarks || !status) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (marksObtained < 0 || totalMarks < 1 || !["Unit Test", "Prelim", "Re-Unit", "Re-Prelim"].includes(examType) || !["Present", "Absent"].includes(status)) {
      return res.status(400).json({ message: "Invalid input data" });
    }

    let marksEntry = await Marks.findOne({ studentId, academicYear });

    if (!marksEntry) {
      marksEntry = new Marks({
        studentId,
        teacherId,
        academicYear,
        exams: [{
          examType,
          subjects: [{
            subjectName,
            marksObtained: status === "Absent" ? undefined : marksObtained,
            totalMarks: status === "Absent" ? undefined : totalMarks,
            status
          }]
        }]
      });
    } else {
      let examIndex = marksEntry.exams.findIndex(exam => exam.examType === examType);

      if (examIndex > -1) {
        let subjectIndex = marksEntry.exams[examIndex].subjects.findIndex(sub => sub.subjectName === subjectName);
        if (subjectIndex > -1) {
          return res.status(400).json({ message: "Marks already exist for this subject in this exam" });
        }

        marksEntry.exams[examIndex].subjects.push({ subjectName, marksObtained: status === "Absent" ? undefined : marksObtained, totalMarks: status === "Absent" ? undefined : totalMarks, status });
      } else {
        marksEntry.exams.push({
          examType,
          subjects: [{ subjectName, marksObtained: status === "Absent" ? undefined : marksObtained, totalMarks: status === "Absent" ? undefined : totalMarks, status }]
        });
      }
    }

    await marksEntry.save();
    res.status(201).json({ message: "Marks added successfully", marksEntry });

  } catch (error) {
    console.error("Error adding marks:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update Marks
router.put("/update", async (req, res) => {
  try {
    const { studentId, academicYear, examType, subjectName, marksObtained, totalMarks, status } = req.body;

    if (!studentId || !academicYear || !examType || !subjectName || marksObtained === undefined || !totalMarks || !status) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (marksObtained < 0 || totalMarks < 1 || !["Present", "Absent"].includes(status)) {
      return res.status(400).json({ message: "Invalid marks data" });
    }

    let marksEntry = await Marks.findOne({ studentId, academicYear });
    if (!marksEntry) {
      return res.status(404).json({ message: "Marks record not found" });
    }

    let examIndex = marksEntry.exams.findIndex(exam => exam.examType === examType);
    if (examIndex === -1) {
      return res.status(404).json({ message: "Exam not found" });
    }

    let subjectIndex = marksEntry.exams[examIndex].subjects.findIndex(sub => sub.subjectName === subjectName);
    if (subjectIndex === -1) {
      return res.status(404).json({ message: "Subject not found" });
    }

    marksEntry.exams[examIndex].subjects[subjectIndex].marksObtained = status === "Absent" ? undefined : marksObtained;
    marksEntry.exams[examIndex].subjects[subjectIndex].totalMarks = status === "Absent" ? undefined : totalMarks;
    marksEntry.exams[examIndex].subjects[subjectIndex].status = status;

    await marksEntry.save();
    res.status(200).json({ message: "Marks updated successfully", marksEntry });

  } catch (error) {
    console.error("Error updating marks:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete Marks
router.delete("/delete", async (req, res) => {
  try {
    const { studentId, academicYear, examType, subjectName } = req.body;

    if (!studentId || !academicYear || !examType || !subjectName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    let marksEntry = await Marks.findOne({ studentId, academicYear });
    if (!marksEntry) {
      return res.status(404).json({ message: "Marks record not found" });
    }

    let examIndex = marksEntry.exams.findIndex(exam => exam.examType === examType);
    if (examIndex === -1) {
      return res.status(404).json({ message: "Exam not found" });
    }

    let subjectIndex = marksEntry.exams[examIndex].subjects.findIndex(sub => sub.subjectName === subjectName);
    if (subjectIndex === -1) {
      return res.status(404).json({ message: "Subject not found" });
    }

    marksEntry.exams[examIndex].subjects.splice(subjectIndex, 1);

    if (marksEntry.exams[examIndex].subjects.length === 0) {
      marksEntry.exams.splice(examIndex, 1);
    }

    if (marksEntry.exams.length === 0) {
      await Marks.deleteOne({ studentId, academicYear });
      return res.status(200).json({ message: "Marks record deleted successfully" });
    }

    await marksEntry.save();
    res.status(200).json({ message: "Marks deleted successfully", marksEntry });

  } catch (error) {
    console.error("Error deleting marks:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get class teacher dashboard details
router.get("/dashboard/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.isClassTeacher) {
      return res.status(403).json({ message: "Unauthorized or not a class teacher" });
    }

    const { year, division } = teacher.assignedClass;

    const students = await Student.find({ year, division });

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
            if (subject.status === "Absent") return;

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

    for (let subject in subjectPerformance) {
      subjectPerformance[subject].avgMarks = subjectPerformance[subject].totalMarks / subjectPerformance[subject].count;
    }

    for (let exam in examPerformance) {
      examPerformance[exam].avgMarks = examPerformance[exam].totalMarks / examPerformance[exam].count;
    }

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

// Route to fetch subjects assigned (for Subject Teacher)
router.get("/subjects-list/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.isSubjectTeacher) {
      return res.status(404).json({ message: "Subject Teacher not found" });
    }

    res.json({
      subjects: teacher.subjects,
    });
  } catch (error) {
    console.error("Error fetching subject details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
