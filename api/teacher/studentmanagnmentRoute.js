// Import necessary modules
const express = require("express");
const router = express.Router();
const Teacher = require("../../models/teacheraccount");
const Student = require("../../models/studentModel.js");
const bcrypt = require('bcryptjs');
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

    // Find the Subject Teacher & Assigned Subjects
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    if (!teacher.isSubjectTeacher) {
      return res.status(403).json({ message: "Not authorized to fetch students" });
    }

    const subjects = teacher.subjects; // Access the subjects array
    console.log("Teacher Object:", teacher); // Debugging line
    console.log("Assigned Subjects:", subjects); // Debugging line

    // Check if subjects is defined and is an array
    if (!Array.isArray(subjects)) {
      return res.status(400).json({ message: "Assigned subjects are not defined or not an array" });
    }

    // Fetch students for each subject based on year & division
    const studentData = {};
    for (const subject of subjects) {
      if (!subject.year || !subject.division) {
        console.error("Subject missing year or division:", subject);
        continue;
      }

      // Use a composite key for year and division
      const key = `${subject.year}-${subject.division}`;
      if (!studentData[key]) {
        studentData[key] = [];
      }

      const students = await Student.find({
        year: subject.year,
        division: subject.division,
      });

      studentData[key].push(...students); // Store students under the composite key
    }

    console.log("Student Data:", studentData); // Debugging line

    res.status(200).json({ subjects, studentData });
  } catch (error) {
    console.error("Error fetching students for subjects:", error);
    res.status(500).json({ message: "Internal Server Error" });
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

// ✅ Route to fetch class details (for Class Teacher)
router.get("/class-details/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Find teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.isClassTeacher) {
      return res.status(404).json({ message: "Class Teacher not found" });
    }

    res.json({
      classTeacher: teacher.name,
      department: teacher.department,
      year: teacher.assignedClass?.year,
      division: teacher.assignedClass?.division,
    });
  } catch (error) {
    console.error("Error fetching class details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ✅ Route to fetch subjects assigned (for Subject Teacher)
router.get("/subject-details/:teacherId", async (req, res) => {
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
    const { rollNo, name, email, year, division } = req.body;
    const teacherId = req.headers.teacherid; // Extract from frontend session storage
    const adminId = req.headers.adminid; // Extract from frontend session storage

    // ✅ Validate required fields
    if (!teacherId || !adminId || !rollNo || !name || !email) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    // ✅ Find the Teacher (Class Teacher or Subject Teacher)
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(403).json({ message: "Teacher not found" });
    }

    let assignedYear = year;
    let assignedDivision = division;

    if (teacher.isClassTeacher) {
      // ✅ Use Class Teacher's assigned class if year & division are missing
      assignedYear = year || teacher.assignedClass.year;
      assignedDivision = division || teacher.assignedClass.division;
    } else if (teacher.isSubjectTeacher) {
      // ✅ Ensure Subject Teacher is adding students to a valid assigned subject
      const validSubject = teacher.assignedSubjects.some(
        (subject) => subject.year === year && subject.division === division
      );

      if (!validSubject) {
        return res.status(403).json({ message: "Not authorized to add students to this class" });
      }
    } else {
      return res.status(403).json({ message: "Not authorized to add students" });
    }

    // ✅ Check if student already exists
    let student = await Student.findOne({ email });
    if (student) {
      return res.status(400).json({ message: "Student with this email already exists." });
    }

    // ✅ Generate a random password
    const randomPassword = crypto.randomBytes(6).toString("hex"); // Generates a 6-character password
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // ✅ Create and save new student
    const newStudent = new Student({
      rollNo,
      name,
      email,
      password: hashedPassword, // Store the hashed password
      year: assignedYear,
      division: assignedDivision,
      teacherId, // Store Teacher ID
      adminId, // Store Admin ID
    });

    await newStudent.save();

    // ✅ Send Email with Credentials
    await sendEmail(email, randomPassword, name);

    return res.status(201).json({ message: "Student added successfully & email sent!", student: newStudent });

  } catch (error) {
    console.error("Error adding student:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
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

router.delete("/delete-student/:teacherId/:studentId", async (req, res) => {
  try {
    const { teacherId, studentId } = req.params;

    // ✅ Find Class Teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.isClassTeacher) {
      return res.status(403).json({ message: "Not authorized to delete students" });
    }

    // ✅ Find and delete student
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
    const { rollNo, name, email } = req.body;

    // ✅ Find the Class Teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.isClassTeacher) {
      return res.status(403).json({ message: "Not authorized to update students" });
    }

    // ✅ Find the student in the teacher’s assigned class
    const { year, division } = teacher.assignedClass;
    let student = await Student.findOne({ _id: studentId, year, division });

    if (!student) {
      return res.status(404).json({ message: "Student not found in this class" });
    }

    // ✅ Update student details
    student.rollNo = rollNo || student.rollNo;
    student.name = name || student.name;
    student.email = email || student.email;
    await student.save();

    res.status(200).json({ message: "Student updated successfully!", student });
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const upload = multer({ dest: "uploads/" });

// ✅ Import Students from Excel
router.post("/import-students", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const teacherId = req.headers.teacherid;
    const adminId = req.headers.adminid;

    if (!file) return res.status(400).json({ message: "No file uploaded" });

    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.isClassTeacher) {
      return res.status(403).json({ message: "Not authorized to import students" });
    }

    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!data.length) return res.status(400).json({ message: "Empty Excel file" });

    const requiredColumns = ["RollNo", "Name", "Email"];
    const fileColumns = Object.keys(data[0]).map((col) => col.trim());

    const missingColumns = requiredColumns.filter((col) => !fileColumns.includes(col));
    if (missingColumns.length > 0) {
      return res.status(400).json({ message: `Missing columns: ${missingColumns.join(", ")}` });
    }

    const { year, division } = teacher.assignedClass;
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
        teacherId,
        adminId,
      });

      await sendEmail(row.Email, randomPassword, row.Name);
    }

    await Student.insertMany(students);
    fs.unlinkSync(file.path); // ✅ Delete the file after reading

    res.status(201).json({ message: "Students imported successfully!" });
  } catch (error) {
    console.error("❌ Error importing students:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});




router.get("/generate-report/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    // ✅ Find Teacher & Assigned Class
    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.isClassTeacher) {
      return res.status(403).json({ message: "Not authorized to generate report" });
    }

    const { year, division } = teacher.assignedClass;
    const students = await Student.find({ year, division });

    if (students.length === 0) {
      return res.status(404).json({ message: "No students found to generate report" });
    }

    // ✅ Create reports directory if missing
    const reportsDir = path.join(__dirname, "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // ✅ PDF File Path
    const filePath = path.join(reportsDir, `student_report_${year}_${division}.pdf`);
    const doc = new PDFDocument({ margin: 50 });

    // ✅ Stream PDF to file
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ✅ HEADER SECTION
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
    doc.text(`Date of Exam: 24/08/24`, { align: "left" });
    doc.text(`Subject Name: Computer Graphics`, { align: "left" });
    doc.text(`Subject Code: 210244`, { align: "left" }).moveDown(1);

    // ✅ TABLE HEADER (Roll No, Name, Email)
    doc
      .fontSize(12)
      .text("Roll No", 50, doc.y, { continued: true })
      .text("Name", 150, doc.y, { continued: true })
      .text("Email", 300)
      .moveDown(0.5);
    
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(); // Draw a line separator

    // ✅ STUDENT DATA (Without Marks)
    students.forEach((student) => {
      doc
        .fontSize(10)
        .text(student.rollNo.toString(), 50, doc.y, { continued: true })
        .text(student.name, 150, doc.y, { continued: true })
        .text(student.email, 300)
        .moveDown(0.5);
    });

    doc.moveDown(2);

    // ✅ FOOTER - TEACHER NAME & SIGNATURE
    doc.text(`Name of Subject Teacher: ${teacher.name || "Not Assigned"}`, { align: "left" });
    doc.text(`Signature: _____________________`, { align: "left" });

    doc.end();

    // ✅ Send File for Download
    stream.on("finish", () => {
      res.download(filePath, `Student_Report_${year}_${division}.pdf`, () => {
        fs.unlinkSync(filePath); // ✅ Delete file after download
      });
    });

  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


module.exports = router;