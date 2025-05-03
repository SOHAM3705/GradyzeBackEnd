const express = require("express");
const router = express.Router();
const Teacher = require("../../models/teacheraccount");
const Student = require("../../models/studentModel");
const Marks = require("../../models/marksschema");
const mongoose = require('mongoose');

router.post("/add-marks", async (req, res) => {
  try {
    const { studentId, teacherId, examType, year, subjectName, isAbsent, marks } = req.body;

    // Validation
    if (!studentId || !teacherId || !examType || !year || !subjectName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Calculate marks based on absent status
    let marksEntry;
    if (isAbsent) {
      marksEntry = {
        subjectName,
        teacherId,
        marksObtained: { q1q2: -1, q3q4: 0, q5q6: 0, q7q8: 0, total: -1 },
        totalMarks: 0,
        status: "Absent"
      };
    } else {
      const { q1q2, q3q4, q5q6, q7q8 } = marks;
      const total = q1q2 + q3q4 + q5q6 + q7q8;
      const totalMarks = examType.includes('unit') ? 30 : 70;
      const passingMarks = examType.includes('unit') ? 12 : 28;

      marksEntry = {
        subjectName,
        teacherId,
        marksObtained: { q1q2, q3q4, q5q6, q7q8, total },
        totalMarks,
        status: total >= passingMarks ? "Pass" : "Fail"
      };
    }

    // Find or create marks record
    let record = await Marks.findOne({ 
      studentId, 
      examType, 
      year 
    });

    if (record) {
      // Update existing exam or add new subject
      const examIndex = record.exams.findIndex(
        e => e.subjectName === subjectName && e.teacherId.equals(teacherId)
      );
      
      if (examIndex >= 0) {
        record.exams[examIndex] = marksEntry;
      } else {
        record.exams.push(marksEntry);
      }
    } else {
      record = new Marks({
        studentId,
        examType,
        year,
        exams: [marksEntry]
      });
    }

    await record.save();
    res.status(201).json({ message: "Marks saved successfully" });

  } catch (error) {
    console.error("Add Marks Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ UPDATE MARKS WITH ABSENT SUPPORT (UPDATED)
router.put("/update-marks/:recordId", async (req, res) => {
  try {
    const { recordId } = req.params;
    const { subjectName, teacherId, isAbsent, marks } = req.body;

    const record = await Marks.findById(recordId);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    const examIndex = record.exams.findIndex(
      e => e.subjectName === subjectName && e.teacherId.equals(teacherId)
    );

    if (examIndex === -1) {
      return res.status(404).json({ message: "Subject not found in record" });
    }

    if (isAbsent) {
      record.exams[examIndex] = {
        ...record.exams[examIndex],
        marksObtained: { q1q2: -1, q3q4: 0, q5q6: 0, q7q8: 0, total: -1 },
        status: "Absent"
      };
    } else {
      const { q1q2, q3q4, q5q6, q7q8 } = marks;
      const total = q1q2 + q3q4 + q5q6 + q7q8;
      const passingMarks = record.examType.includes('unit') ? 12 : 28;

      record.exams[examIndex] = {
        ...record.exams[examIndex],
        marksObtained: { q1q2, q3q4, q5q6, q7q8, total },
        status: total >= passingMarks ? "Pass" : "Fail"
      };
    }

    await record.save();
    res.status(200).json({ message: "Marks updated successfully" });

  } catch (error) {
    console.error("Update Marks Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ DELETE MARKS FOR SUBJECT (UPDATED)
router.delete("/delete-marks/:recordId", async (req, res) => {
  try {
    const { recordId } = req.params;
    const { subjectName, teacherId } = req.body;

    const record = await Marks.findById(recordId);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    // Remove the specific exam
    record.exams = record.exams.filter(
      exam => !(exam.subjectName === subjectName && exam.teacherId.equals(teacherId))
    );

    // If no exams left, delete the whole record
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

// ✅ FETCH MARKS FOR STUDENT (UPDATED)
router.get("/student-marks/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { examType, year } = req.query;

    const query = { studentId };
    if (examType) query.examType = examType;
    if (year) query.year = year;

    const records = await Marks.find(query);

    if (!records || records.length === 0) {
      return res.status(404).json({ message: "No marks found" });
    }

    // Transform data for better client consumption
    const result = records.map(record => ({
      examType: record.examType,
      year: record.year,
      exams: record.exams.map(exam => ({
        subjectName: exam.subjectName,
        teacherId: exam.teacherId,
        marks: exam.status === "Absent" 
          ? "Absent" 
          : {
              breakdown: {
                q1q2: exam.marksObtained.q1q2,
                q3q4: exam.marksObtained.q3q4,
                q5q6: exam.marksObtained.q5q6,
                q7q8: exam.marksObtained.q7q8
              },
              total: exam.marksObtained.total,
              outOf: exam.totalMarks,
              percentage: Math.round((exam.marksObtained.total / exam.totalMarks) * 100)
            },
        status: exam.status,
        dateAdded: exam.dateAdded
      }))
    }));

    res.status(200).json(result);

  } catch (error) {
    console.error("Fetch Marks Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

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
router.get("/:teacherId/subject/:subjectName/students", async (req, res) => {
  try {
    const { teacherId, subjectName } = req.params;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Get students assigned to the teacher (update if you're using sections/classes)
    const students = await Student.find({
      teacherId: new mongoose.Types.ObjectId(teacherId)
    }).select("_id name rollNo email");

    // Fetch all marks documents for these students
    const studentIds = students.map((s) => s._id);
    const marksData = await Marks.find({
      studentId: { $in: studentIds },
      "exams.subjectName": subjectName // filters only those that contain the subject in any exam
    });

    const examData = {};

    students.forEach((student) => {
      const studentMarks = marksData.find(
        (mark) => mark.studentId.toString() === student._id.toString()
      );

      if (studentMarks) {
        studentMarks.exams.forEach((exam) => {
          if (exam.subjectName === subjectName && exam.teacherId.toString() === teacherId) {
            if (!examData[student._id]) {
              examData[student._id] = {};
            }

            examData[student._id][exam.examType] = {
              marksObtained: exam.status === "Absent" ? "Absent" : exam.marksObtained, // full breakdown if present
              totalMarks: exam.status === "Absent" ? "Absent" : exam.totalMarks,
              status: exam.status
            };
          }
        });
      }
    });

    res.json({
      students: students.map((student) => ({
        id: student._id,
        name: student.name,
        rollNo: student.rollNo,
        email: student.email
      })),
      examData
    });
  } catch (error) {
    console.error("Error fetching subject students marks:", error);
    res.status(500).json({
      message: "Error fetching subject students marks",
      error: error.message
    });
  }
});

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

router.get("/get-marks/:subjectId", async (req, res) => {
  try {
    const { subjectId } = req.params;

    // ✅ Get subject details to extract subjectName and teacherId
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const { name: subjectName, teacherId } = subject;

    // ✅ Confirm teacher exists
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // ✅ Get all students assigned to this teacher
    const students = await Student.find({ teacherId: new mongoose.Types.ObjectId(teacherId) })
      .select("_id name rollNo email");

    const studentIds = students.map((s) => s._id);

    // ✅ Fetch all relevant marks for these students
    const marksData = await Marks.find({
      studentId: { $in: studentIds },
      "exams.subjectName": subjectName
    });

    // ✅ Prepare response
    const examData = {};

    students.forEach((student) => {
      const studentMarks = marksData.find(
        (mark) => mark.studentId.toString() === student._id.toString()
      );

      if (studentMarks) {
        studentMarks.exams.forEach((exam) => {
          if (exam.subjectName === subjectName && exam.teacherId.toString() === teacherId.toString()) {
            if (!examData[student._id]) {
              examData[student._id] = {};
            }

            // Store the marks with the breakdown if not absent
            examData[student._id][exam.examType] = {
              marksObtained: exam.status === "Absent" 
                ? "Absent" 
                : {
                    q1q2: exam.marksObtained.q1q2, // Breakdown of q1q2 marks
                    q3q4: exam.marksObtained.q3q4, // Breakdown of q3q4 marks
                    q5q6: exam.marksObtained.q5q6, // Breakdown of q5q6 marks
                    q7q8: exam.marksObtained.q7q8, // Breakdown of q7q8 marks
                    total: exam.marksObtained.total // Total marks
                },
              totalMarks: exam.status === "Absent" ? "Absent" : exam.totalMarks,
              status: exam.status
            };
          }
        });
      }
    });

    res.json({
      students: students.map((student) => ({
        id: student._id,
        name: student.name,
        rollNo: student.rollNo,
        email: student.email
      })),
      examData
    });

  } catch (error) {
    console.error("Error fetching subject students marks:", error);
    res.status(500).json({
      message: "Error fetching subject students marks",
      error: error.message
    });
  }
});


module.exports = router;
