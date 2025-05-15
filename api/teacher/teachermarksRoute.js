const express = require("express");
const router = express.Router();
const Teacher = require("../../models/teacheraccount");
const Student = require("../../models/studentModel");
const Marks = require("../../models/marksschema");
const mongoose = require('mongoose');
const { generatePdf, generateExcel, generateClassPdf, generateClassExcel } = require("../../utils/exportgenerator");
const auth = require("../../middleware/teacherauth");

// Get marks by subject name and exam type
router.get("/marks-by-subject", async (req, res) => {
  try {
    const { subjectName, examType } = req.query;

    if (!subjectName || !examType) {
      return res.status(400).json({ 
        message: "Subject name and exam type are required" 
      });
    }

    // Find all marks records for this exam type
    const marksData = await Marks.find({ 
      examType,
      "exams.subjectName": subjectName 
    });

    // Transform the data to group by student
    const result = {};
    
    marksData.forEach(record => {
      record.exams.forEach(exam => {
        if (exam.subjectName === subjectName) {
          if (!result[record.studentId]) {
            result[record.studentId] = {};
          }
          
          result[record.studentId][record.examType] = {
            marksObtained: exam.status === "Absent" 
              ? "Absent" 
              : exam.marksObtained,
            totalMarks: exam.totalMarks,
            status: exam.status
          };
        }
      });
    });

    res.status(200).json(result);

  } catch (error) {
    console.error("Error fetching marks by subject:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
});

router.post("/add-marks", async (req, res) => {
  try {
    const marksArray = req.body;

    if (!Array.isArray(marksArray) || marksArray.length === 0) {
      return res.status(400).json({ message: "No marks data provided" });
    }

    for (const entry of marksArray) {
      const { studentId, examType, year, exams } = entry;

      if (!studentId || !examType || !year || !exams || !Array.isArray(exams)) {
        continue; // Skip invalid entries
      }

      // Find if a record already exists for this student, examType and year
      let record = await Marks.findOne({ studentId, examType, year });

      for (const exam of exams) {
        const { subjectName, teacherId } = exam;

        if (!subjectName || !teacherId) continue;

        // If record exists, update or add exam
        if (record) {
          const examIndex = record.exams.findIndex(
            e => e.subjectName === subjectName && e.teacherId.equals(teacherId)
          );

          if (examIndex >= 0) {
            // Update existing exam
            record.exams[examIndex] = exam;
          } else {
            // Add new exam
            record.exams.push(exam);
          }
        } else {
          // Create new record
          record = new Marks({
            studentId,
            examType,
            year,
            exams: [exam]
          });
        }
      }

      if (record) {
        await record.save();
      }
    }

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

router.delete("/delete-marks", async (req, res) => {
  try {
    const { subjectName, teacherId, examType } = req.body;

    if (!subjectName || !teacherId || !examType) {
      return res.status(400).json({ 
        message: "Subject name, teacher ID and exam type are required" 
      });
    }

    // Find all records that match the criteria
    const records = await Marks.find({
      examType,
      "exams.subjectName": subjectName,
      "exams.teacherId": teacherId
    });

    if (!records || records.length === 0) {
      return res.status(404).json({ message: "No matching marks found" });
    }

    // Update each record to remove the specified exam
    for (const record of records) {
      record.exams = record.exams.filter(
        exam => !(exam.subjectName === subjectName && exam.teacherId.equals(teacherId))
      );

      if (record.exams.length === 0) {
        await Marks.findByIdAndDelete(record._id);
      } else {
        await record.save();
      }
    }

    res.status(200).json({ message: "Marks deleted successfully" });

  } catch (error) {
    console.error("Delete Marks Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/student-marks", async (req, res) => {
  try {
    const { studentId, examType, year, subjectName } = req.query;

    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }

    const query = { studentId };
    if (examType) query.examType = examType;
    if (year) query.year = year;

    const records = await Marks.find(query);

    if (!records || records.length === 0) {
      return res.status(404).json({ message: "No marks found" });
    }
    
    const filteredExams = records.map(record => ({
      examType: record.examType,
      year: record.year,
      exams: record.exams.filter(exam => 
        !subjectName || exam.subjectName === subjectName
      )
    })).filter(record => record.exams.length > 0);

    if (filteredExams.length === 0) {
      return res.status(404).json({ message: "No matching marks found" });
    }

    // Transform data
    const result = filteredExams.map(record => ({
      examType: record.examType,
      year: record.year,
      exams: record.exams.map(exam => ({
        subjectName: exam.subjectName,
        teacherId: exam.teacherId,
        marks: exam.status === "Absent" 
          ? "Absent" 
          : {
              breakdown: exam.marksObtained,
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

router.get('/export-marks', async (req, res) => {
  try {
    const { subjectName, examType, exportType } = req.query;
    
    // Fetch marks data
    const marks = await Marks.find({
      'exams.subjectName': subjectName,
      examType,
      'exams.teacherId': req.teacherId
    }).populate('studentId');
    
    if (exportType === 'pdf') {
      const pdfDoc = generatePdf(marks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${subjectName}_${examType}_marks.pdf`);
      pdfDoc.pipe(res);
      pdfDoc.end();
    } else {
      const workbook = generateExcel(marks);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${subjectName}_${examType}_marks.xlsx`);
      await XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }).then((buffer) => {
        res.end(buffer);
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Class teacher export
router.get('/export-class-marks', async (req, res) => {
  try {
    const { year, division, exportType } = req.query;
    
    // Fetch all students and subjects
    const students = await Student.find({ year, division }).sort('rollNo');
    const subjects = await Subject.find({ year, division });
    
    // Fetch marks for all students
    const marksData = await Marks.find({
      studentId: { $in: students.map(s => s._id) },
      year
    }).populate('studentId');
    
    if (exportType === 'pdf') {
      const pdfDoc = generateClassPdf(students, subjects, marksData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Class_${year}_${division}_Marks.pdf`);
      pdfDoc.pipe(res);
      pdfDoc.end();
    } else {
      const workbook = generateClassExcel(students, subjects, marksData);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=Class_${year}_${division}_Marks.xlsx`);
      await XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }).then((buffer) => {
        res.end(buffer);
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/teachermarks/class-marks
router.get('/class-marks', async (req, res) => {
  try {
    const { year, division, examType } = req.query;
    const teacherId = req.query.teacherId || req.teacher?._id;

    // 1. Verify the requester is the class teacher for this class
    const classTeacher = await Teacher.findOne({
      _id: teacherId,
      isClassTeacher: true
    });

    if (!classTeacher) {
      return res.status(403).json({ message: 'Access denied - Not a class teacher' });
    }

    // Check assignment using the correct nested structure
    if (!classTeacher.assignedClass || !classTeacher.assignedClass.year) {
      return res.status(400).json({ 
        message: 'Class teacher is not assigned to any class',
        isClassTeacher: true // Confirm role
      });
    }

    // Use the assigned class if no year/division provided in query
    const queryYear = year || classTeacher.assignedClass.year;
    const queryDivision = division || classTeacher.assignedClass.division;

    // 2. Get all students in this class
    const students = await Student.find({ 
      year: queryYear, 
      division: queryDivision,
      adminId: classTeacher.adminId 
    });

    // 3. Get marks for these students (filter by examType if provided)
    const query = {
      studentId: { $in: students.map(s => s._id) },
      year: queryYear
    };

    if (examType) query.examType = examType;

    const marks = await Marks.find(query)
      .populate('studentId', 'name rollNo');

    res.json(marks);
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      error: error.stack 
    });
  }
});

router.get('/:teacherId/class-students', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Check using the correct nested structure
    if (!teacher.assignedClass || !teacher.assignedClass.year) {
      return res.status(400).json({ 
        message: 'Teacher is not assigned to any class',
        isClassTeacher: teacher.isClassTeacher,
        hasAssignedClass: !!teacher.assignedClass,
        debug: teacher.assignedClass // For debugging
      });
    }

    const { year, division } = teacher.assignedClass;

    // Get all students in the teacher's class
    const students = await Student.find({ 
      year, 
      division,
      adminId: teacher.adminId 
    }).sort('rollNo');

    // Get subjects from teacher's record (already populated)
    const subjects = teacher.subjects || [];

    // Get marks for all these students
    const studentIds = students.map(s => s._id);
    const marks = await Marks.find({ 
      studentId: { $in: studentIds },
      year
    }).populate('studentId');

    // Organize the data for response
    const studentsWithMarks = students.map(student => {
      const studentMarks = marks.filter(m => m.studentId._id.equals(student._id));
      
      // Create marks by subject structure
      const marksBySubject = {};
      studentMarks.forEach(mark => {
        mark.exams.forEach(exam => {
          if (!marksBySubject[exam.subjectName]) {
            marksBySubject[exam.subjectName] = {};
          }
          marksBySubject[exam.subjectName][mark.examType] = {
            marksObtained: exam.marksObtained,
            status: exam.status
          };
        });
      });

      return {
        _id: student._id,
        rollNo: student.rollNo,
        name: student.name,
        marks: marksBySubject
      };
    });

    res.json({
      success: true,
      year,
      division,
      students: studentsWithMarks,
      subjects: subjects.map(sub => ({
        _id: sub._id,
        name: sub.name,
        semester: sub.semester
      }))
    });

  } catch (error) {
    console.error('Error in /class-students:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

router.get("/get-marks/:subjectName", async (req, res) => {
  try {
    const { subjectName } = req.params;
    const { examType } = req.query;

    if (!examType) {
      return res.status(400).json({ message: "Exam type is required" });
    }

    // Get all marks for this subject and exam type
    const marksData = await Marks.find({
      examType,
      "exams.subjectName": subjectName
    });

    // Transform the data
    const result = {};
    
    marksData.forEach(record => {
      record.exams.forEach(exam => {
        if (exam.subjectName === subjectName) {
          if (!result[record.studentId]) {
            result[record.studentId] = {};
          }
          
          result[record.studentId] = {
            marksObtained: exam.status === "Absent" 
              ? "Absent" 
              : exam.marksObtained,
            totalMarks: exam.totalMarks,
            status: exam.status
          };
        }
      });
    });

    res.status(200).json(result);

  } catch (error) {
    console.error("Error fetching subject marks:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
});



module.exports = router;
