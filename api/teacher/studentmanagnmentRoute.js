const express = require("express");
const router = express.Router();
const Teacher = require("../../models/teacheraccount");
const Student = require("../../models/studentModel");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const emailContent = require("../../utils/newaccount");
const axios = require("axios");
const dotenv = require("dotenv");
const multer = require("multer");
const xlsx = require("xlsx");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

router.get("/students-by-subject/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    // ✅ Find the Subject Teacher & Get Assigned Subjects
    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.isSubjectTeacher) {
      return res.status(403).json({ message: "Not authorized to fetch students" });
    }

    const subjects = teacher.assignedSubjects; // ✅ Get assigned subjects with semester

    // ✅ Fetch students for each subject based on year, division, and semester
    const studentData = {};
    for (const subject of subjects) {
      const students = await Student.find({
        year: subject.year,
        division: subject.division,
      });

      studentData[subject.name] = {
        semester: subject.semester, // ✅ Fetch semester from Teacher Database
        students: students,
      };
    }

    res.status(200).json({ subjects, studentData });
  } catch (error) {
    console.error("Error fetching students for subjects:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


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

router.get("/class-details/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.isClassTeacher) {
      return res.status(404).json({ message: "Class Teacher not found" });
    }

    res.json({
      classTeacher: teacher.name,
      department: teacher.department,
      year: teacher.assignedClass?.year,
      division: teacher.assignedClass?.division,
      semester: teacher.assignedClass?.semester, // Include semester
    });
  } catch (error) {
    console.error("Error fetching class details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/subject-details/:teacherId", async (req, res) => {
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

const sendEmail = async (email, password, name) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("❌ Resend API Key is missing. Please check your environment variables.");
      return;
    }

    if (!email || typeof email !== "string") {
      console.error("❌ Invalid email address provided:", email);
      return;
    }

    const response = await axios.post("https://api.resend.com/emails", {
      from: "support@gradyze.com",
      to: email,
      subject: "Welcome to Gradyze - Your Account Credentials",
      html: emailContent(name, email, password),
    }, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
    });

    console.log(`✅ Email sent successfully to: ${email}`);
    return response.data;
  } catch (error) {
    console.error("❌ Error sending email:", error.response?.data || error.message);
  }
};

router.post("/add-student", async (req, res) => {
  try {
    const { rollNo, name, email } = req.body;
    const teacherId = req.headers.teacherid;
    const adminId = req.headers.adminid;

    if (!teacherId || !adminId || !rollNo || !name || !email) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    // ✅ Find the Teacher in `teacheraccount` model
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(403).json({ message: "Teacher not found" });
    }

    let assignedYear, assignedDivision, assignedSemester;

    if (teacher.isClassTeacher) {
      // ✅ Fetch semester from Class Teacher's assigned class
      assignedYear = teacher.assignedClass.year;
      assignedDivision = teacher.assignedClass.division;
      assignedSemester = teacher.assignedClass.semester; // ✅ Fetch semester from teacheraccount model
    } else if (teacher.isSubjectTeacher) {
      // ✅ Fetch semester from Subject Teacher's assigned subjects
      const subject = teacher.assignedSubjects.find(
        (subj) => subj.year === assignedYear && subj.division === assignedDivision
      );

      if (!subject) {
        return res.status(403).json({ message: "Not authorized to add students to this class" });
      }

      assignedSemester = subject.semester;
    } else {
      return res.status(403).json({ message: "Not authorized to add students" });
    }

    // ✅ Check if student already exists
    let student = await Student.findOne({ email });
    if (student) {
      return res.status(400).json({ message: "Student with this email already exists." });
    }

    // ✅ Generate a random password
    const randomPassword = crypto.randomBytes(6).toString("hex");
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // ✅ Create and save new student
    const newStudent = new Student({
      rollNo,
      name,
      email,
      password: hashedPassword,
      year: assignedYear,
      division: assignedDivision,
      semester: assignedSemester, // ✅ Now fetched from teacheraccount model
      teacherId,
      adminId,
    });

    await newStudent.save();
    await sendEmail(email, randomPassword, name);

    return res.status(201).json({ message: "Student added successfully!", student: newStudent });

  } catch (error) {
    console.error("Error adding student:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});



router.get("/students/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.isClassTeacher) {
      return res.status(403).json({ message: "Not authorized to view students" });
    }

    const { year, division, semester } = teacher.assignedClass;
    const students = await Student.find({ year, division, semester });

    res.status(200).json({ students });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/delete-student/:teacherId/:studentId", async (req, res) => {
  try {
    const { teacherId, studentId } = req.params;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.isClassTeacher) {
      return res.status(403).json({ message: "Not authorized to delete students" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await Student.deleteOne({ _id: studentId });

    res.status(200).json({ message: "Student removed successfully!" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put("/update-student/:teacherId/:studentId", async (req, res) => {
  try {
    const { teacherId, studentId } = req.params;
    const { rollNo, name, email, semester } = req.body;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.isClassTeacher) {
      return res.status(403).json({ message: "Not authorized to update students" });
    }

    const { year, division } = teacher.assignedClass;
    let student = await Student.findOne({ _id: studentId, year, division });

    if (!student) {
      return res.status(404).json({ message: "Student not found in this class" });
    }

    student.rollNo = rollNo || student.rollNo;
    student.name = name || student.name;
    student.email = email || student.email;
    student.semester = semester || student.semester; // Update semester
    await student.save();

    res.status(200).json({ message: "Student updated successfully!", student });
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const upload = multer({ dest: "uploads/" });

router.post("/import-students", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const teacherId = req.headers.teacherid;
    const adminId = req.headers.adminid;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.isClassTeacher) {
      return res.status(403).json({ message: "Not authorized to import students" });
    }

    const { year, division, semester } = teacher.assignedClass;

    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (data.length === 0) {
      return res.status(400).json({ message: "Empty Excel file or incorrect format." });
    }

    const requiredColumns = ["RollNo", "Name", "Email", "Semester"];
    const fileColumns = Object.keys(data[0]).map(col => col.trim());

    const missingColumns = requiredColumns.filter(col => !fileColumns.includes(col));
    if (missingColumns.length > 0) {
      return res.status(400).json({ message: `Missing columns: ${missingColumns.join(", ")}` });
    }

    const students = [];
    for (const row of data) {
      const randomPassword = crypto.randomBytes(6).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      students.push({
        rollNo: row.RollNo,
        name: row.Name,
        email: row.Email,
        password: hashedPassword,
        year,
        division,
        semester: row.Semester, // Include semester
        teacherId,
        adminId,
      });

      await sendEmail(row.Email, randomPassword, row.Name);
    }

    await Student.insertMany(students);
    res.status(201).json({ message: "Students imported successfully & emails sent!", students });
  } catch (error) {
    console.error("❌ Error importing students:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/generate-report/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.isClassTeacher) {
      return res.status(403).json({ message: "Not authorized to generate report" });
    }

    const { year, division, semester } = teacher.assignedClass;
    const students = await Student.find({ year, division, semester });

    if (students.length === 0) {
      return res.status(404).json({ message: "No students found to generate report" });
    }

    const reportsDir = path.join(__dirname, "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filePath = path.join(reportsDir, `student_report_${year}_${division}_${semester}.pdf`);
    const doc = new PDFDocument({ margin: 50 });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc
      .fontSize(14)
      .text("PIMPRI CHINCHWAD EDUCATION TRUST'S", { align: "center" })
      .moveDown(0.5);
    doc.fontSize(12).text("Pimpri Chinchwad College of Engineering & Research, Ravet, Pune", { align: "center" });
    doc.fontSize(10).text("IQAC PCCOER", { align: "center" }).moveDown(1);

    doc.text(`Academic Year: 2024 – 25`, { align: "left" });
    doc.text(`Term: I`, { align: "left" });
    doc.text(`Evaluation Sheet – Internal Exam`, { align: "left" });
    doc.text(`Department: Computer Engineering`, { align: "left" });
    doc.text(`Class: ${year}`, { align: "left" });
    doc.text(`Division: ${division}`, { align: "left" });
    doc.text(`Semester: ${semester}`, { align: "left" }); // Include semester
    doc.text(`Date of Exam: 24/08/24`, { align: "left" });
    doc.text(`Subject Name: Computer Graphics`, { align: "left" });
    doc.text(`Subject Code: 210244`, { align: "left" }).moveDown(1);

    doc
      .fontSize(12)
      .text("Roll No", 50, doc.y, { continued: true })
      .text("Name", 150, doc.y, { continued: true })
      .text("Email", 300)
      .moveDown(0.5);

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    students.forEach((student) => {
      doc
        .fontSize(10)
        .text(student.rollNo.toString(), 50, doc.y, { continued: true })
        .text(student.name, 150, doc.y, { continued: true })
        .text(student.email, 300)
        .moveDown(0.5);
    });

    doc.moveDown(2);

    doc.text(`Name of Subject Teacher: ${teacher.name || "Not Assigned"}`, { align: "left" });
    doc.text(`Signature: _____________________`, { align: "left" });

    doc.end();

    stream.on("finish", () => {
      res.download(filePath, `Student_Report_${year}_${division}_${semester}.pdf`, () => {
        fs.unlinkSync(filePath);
      });
    });

  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
