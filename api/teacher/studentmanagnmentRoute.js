// Import necessary modules
const express = require("express");
const router = express.Router();
const Teacher = require("../../models/teacheraccount");
const Student = require("../../models/studentModel.js");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const emailContent = require("../../utils/newaccount");
const axios = require("axios");
const dotenv = require("dotenv");

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

    const response = await resendApi.post("", {
      from: "support@gradyze.com",
      to: email,
      subject: "Welcome to Gradyze - Your Account Credentials",
      html: emailContent(name, email, password),
    });

    console.log(`✅ Email sent successfully to: ${email}`);
    return response.data;
  } catch (error) {
    console.error("❌ Error sending email:", error.response?.data || error.message);
  }
};
// ✅ Add Student API with Account Creation
router.post("/add-student", async (req, res) => {
  try {
    const { teacherId, rollNo, name, email } = req.body;

    // ✅ Validate required fields
    if (!teacherId || !rollNo || !name || !email) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    // ✅ Find the Class Teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.isClassTeacher) {
      return res.status(403).json({ message: "Not authorized to add students" });
    }

    const { year, division } = teacher.assignedClass;

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
      year,
      division,
    });

    await newStudent.save();

    // ✅ Send Email with Credentials
    await sendEmail({email,randomPassword,name,
    });

    return res.status(201).json({ message: "Student added successfully & email sent!", student: newStudent });

  } catch (error) {
    console.error("Error adding student:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});

// ✅ Fetch Students for Class Teacher
router.get("/students/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    // ✅ Find Class Teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.isClassTeacher) {
      return res.status(403).json({ message: "Not authorized to view students" });
    }

    // ✅ Fetch students based on assigned class
    const { year, division } = teacher.assignedClass;
    const students = await Student.find({ year, division });

    res.status(200).json({ students });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Internal Server Error" });
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


module.exports = router;
