const express = require("express");
const Marks = require("../../models/marksschema"); // Your marks model
const router = express.Router();

// ✅ Available Academic Years
const academicYears = ["First Year", "Second Year", "Third Year", "Fourth Year"];

// ✅ Available Semesters by Year
const semesterData = {
  "First Year": ["Semester 1", "Semester 2"],
  "Second Year": ["Semester 3", "Semester 4"],
  "Third Year": ["Semester 5", "Semester 6"],
  "Fourth Year": ["Semester 7", "Semester 8"],
};

// ✅ Available Subjects by Year & Semester
const subjectData = {
  "First Year": {
    "Semester 1": ["Mathematics", "Physics"],
    "Semester 2": ["Chemistry", "Biology"],
  },
  "Second Year": {
    "Semester 3": ["Programming", "Networks"],
    "Semester 4": ["Data Science", "AI"],
  },
  "Third Year": {
    "Semester 5": ["Machine Learning", "Cloud Computing"],
    "Semester 6": ["Cybersecurity", "Web Development"],
  },
  "Fourth Year": {
    "Semester 7": ["Big Data", "IoT"],
    "Semester 8": ["Project Work", "Technical Writing"],
  },
};

// ✅ 1️⃣ Fetch Academic Years
router.get("/years", (req, res) => {
  res.status(200).json(academicYears);
});

// ✅ 2️⃣ Fetch Semesters for a Given Year
router.get("/semesters", (req, res) => {
  const { year } = req.query;
  if (!year || !semesterData[year]) {
    return res.status(400).json({ error: "Invalid or missing year" });
  }
  res.status(200).json(semesterData[year]);
});

// ✅ 3️⃣ Fetch Subjects for a Given Year & Semester
router.get("/subjects", (req, res) => {
  const { year, semester } = req.query;
  if (!year || !semester || !subjectData[year]?.[semester]) {
    return res.status(400).json({ error: "Invalid or missing year/semester" });
  }
  res.status(200).json(subjectData[year][semester]);
});

// ✅ 4️⃣ Fetch Marks for a Student by Year, Semester, Subject
router.get("/marks", async (req, res) => {
  try {
    const studentId = req.headers.studentid; // Get studentId from sessionStorage
    const { year, semester, subject } = req.query;

    if (!studentId || !year || !semester || !subject) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // ✅ Find marks for the specific student, year, semester, and subject
    const marksRecord = await Marks.findOne({
      studentId,
      academicYear: year,
      "exams.examType": { $exists: true },
    });

    if (!marksRecord) return res.status(200).json([]); // ✅ Return empty array if no marks found

    // ✅ Extract subject-specific marks
    const subjectMarks = marksRecord.exams.flatMap((exam) => {
      return exam.subjects
        .filter((s) => s.subjectName === subject)
        .map((s) => ({
          examType: exam.examType,
          marks: s.marksObtained,
          maxMarks: s.totalMarks,
        }));
    });

    return res.status(200).json(subjectMarks);
  } catch (error) {
    console.error("Error fetching marks:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
