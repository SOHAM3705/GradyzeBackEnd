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

router.put("/update", async (req, res) => {
  try {
    const {
      studentId,
      academicYear,
      examType,
      subjectName,
      marksObtained,
      totalMarks,
      status
    } = req.body;

    if (!studentId || !academicYear || !examType || !subjectName || !status) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!["Unit Test", "Prelim", "Re-Unit", "Re-Prelim"].includes(examType)) {
      return res.status(400).json({ message: "Invalid exam type" });
    }

    if (!["Present", "Absent"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (status === "Present") {
      if (marksObtained === undefined || totalMarks === undefined) {
        return res.status(400).json({ message: "Marks and total required when status is Present" });
      }

      if (marksObtained < 0 || totalMarks < 1 || marksObtained > totalMarks) {
        return res.status(400).json({ message: "Invalid marks values" });
      }
    }

    const marksEntry = await Marks.findOne({ studentId, academicYear });
    if (!marksEntry) {
      return res.status(404).json({ message: "Marks record not found" });
    }

    const exam = marksEntry.exams.find(ex => ex.examType === examType);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const subject = exam.subjects.find(sub => sub.subjectName === subjectName);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    subject.status = status;
    if (status === "Absent") {
      subject.marksObtained = undefined;
      subject.totalMarks = undefined;
    } else {
      subject.marksObtained = marksObtained;
      subject.totalMarks = totalMarks;
    }

    await marksEntry.save();
    res.status(200).json({ message: "Marks updated successfully", marksEntry });

  } catch (error) {
    console.error("Error updating marks:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// ✅ ADD MARKS
router.post("/add", authMiddleware, async (req, res) => {
  const marksData = req.body;

  if (!Array.isArray(marksData) || marksData.length === 0) {
    return res.status(400).json({ message: "Invalid data format" });
  }

  try {
    for (const entry of marksData) {
      const { studentId, teacherId, year, examType, subjectId, marksObtained } = entry;

      if (!studentId || !teacherId || !year || !examType || !subjectId || marksObtained === undefined) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const totalMarks = (examType === "unit-test" || examType === "re-unit-test") ? 30 : 70;
      let status;

      if (marksObtained === -1) {
        status = "Absent";
      } else {
        const passingMarks = (examType === "unit-test" || examType === "re-unit-test") ? 12 : 28;
        status = marksObtained >= passingMarks ? "Pass" : "Fail";
      }

      let existingRecord = await Marks.findOne({
        teacherId,
        studentId,
        examType,
        year,
      });

      if (existingRecord) {
        const existingExam = existingRecord.exams.find(
          (exam) => exam.subjectId.toString() === subjectId.toString()
        );

        if (existingExam) {
          existingExam.marksObtained = marksObtained;
          existingExam.totalMarks = totalMarks;
          existingExam.status = status;
        } else {
          existingRecord.exams.push({ subjectId, marksObtained, totalMarks, status });
        }

        await existingRecord.save();
      } else {
        const newRecord = new Marks({
          teacherId,
          studentId,
          examType,
          year,
          exams: [{ subjectId, marksObtained, totalMarks, status }],
        });

        await newRecord.save();
      }
    }

    res.status(200).json({ message: "Marks saved successfully" });
  } catch (error) {
    console.error("Add Marks Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// ✅ UPDATE MARKS
router.put("/update/:id", authMiddleware, async (req, res) => {
  const markId = req.params.id;
  const { subjectId, marksObtained, examType } = req.body;

  if (!subjectId || marksObtained === undefined || !examType) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const record = await Marks.findById(markId);
    if (!record) {
      return res.status(404).json({ message: "Marks record not found" });
    }

    const subjectIndex = record.exams.findIndex(
      (exam) => exam.subjectId.toString() === subjectId.toString()
    );

    if (subjectIndex === -1) {
      return res.status(404).json({ message: "Subject not found in exams" });
    }

    const totalMarks = (examType === "unit-test" || examType === "re-unit-test") ? 30 : 70;
    const passingMarks = examType.includes("unit") ? 12 : 28;

    let status;
    if (marksObtained === -1) status = "Absent";
    else status = marksObtained >= passingMarks ? "Pass" : "Fail";

    record.exams[subjectIndex] = {
      ...record.exams[subjectIndex],
      marksObtained,
      totalMarks,
      status,
    };

    await record.save();
    res.status(200).json({ message: "Marks updated successfully" });
  } catch (error) {
    console.error("Update Marks Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// ✅ DELETE MARKS FOR A SUBJECT IN AN ENTRY
router.delete("/delete/:id/:subjectId", authMiddleware, async (req, res) => {
  const { id, subjectId } = req.params;

  try {
    const record = await Marks.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Marks record not found" });
    }

    record.exams = record.exams.filter(
      (exam) => exam.subjectId.toString() !== subjectId
    );

    if (record.exams.length === 0) {
      await record.deleteOne();
    } else {
      await record.save();
    }

    res.status(200).json({ message: "Marks deleted successfully" });
  } catch (error) {
    console.error("Delete Marks Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;



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
