const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Teacher = require("../../models/teacheraccount");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const axios = require("axios");
const authMiddleware = require("../../middleware/auth");
const auth = require("../../middleware/authmiddleware");

dotenv.config(); // Load environment variables

/** ✅ Function to Merge Subjects */
const mergeSubjects = (existingSubjects, newSubjects) => {
    const subjectMap = new Map();

    existingSubjects.forEach(subject => {
        const key = `${subject.name}-${subject.year}-${subject.semester}-${subject.division}`;
        subjectMap.set(key, subject);
    });

    newSubjects.forEach(subject => {
        const key = `${subject.name}-${subject.year}-${subject.semester}-${subject.division}`;
        subjectMap.set(key, subject);
    });

    return Array.from(subjectMap.values());
};

const emailContent = require("../../utils/newaccount"); // Import email template

/** ✅ Function to Send Email via Resend API */
const sendEmail = async (email, password, name) => {
    try {
        await axios.post("https://api.resend.com/emails", {
            from: "support@gradyze.com",
            to: email,
            subject: "Welcome to Gradyze - Your Account Credentials",
            html: emailContent(name, email, password),
        }, {
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
        });

        console.log("Email sent successfully to:", email);
    } catch (error) {
        console.error("Error sending email:", error);
    }
};
/** ✅ Add or Update Teacher */
router.post("/add", async (req, res) => {
    try {
      const { name, email, department, subjects, adminId } = req.body;
  
      // ✅ Validate all required fields
      if (!name || !email || !department || !subjects || !adminId) {
        return res.status(400).json({ message: "All fields are required" });
      }
  
      // ✅ Check if teacher already exists
      let existingTeacher = await Teacher.findOne({ email });
  
      if (existingTeacher) {
        // ✅ Update existing teacher's subjects
        existingTeacher.subjects = mergeSubjects(existingTeacher.subjects, subjects);
        await existingTeacher.save();
        return res.status(200).json({ message: "Subjects updated successfully" });
      }
  
      // ✅ Generate a random password
      const randomPassword = crypto.randomBytes(6).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
  
      // ✅ Create new teacher
      const newTeacher = new Teacher({
        name,
        email,
        password: hashedPassword,
        department,
        subjects,
        adminId, // ✅ Store adminId
      });
  
      await newTeacher.save();
      await sendEmail(email, randomPassword, name);
  
      return res.status(201).json({ message: "Teacher added successfully, credentials sent via email" });
  
    } catch (error) {
      console.error("❌ Error in adding/updating teacher:", error.message, error.stack);
      return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  });
  

/** ✅ Remove Subject */
router.post("/remove-subject", auth, async (req, res) => {
    try {
        const { email, subjectName, year, semester, division } = req.body;

        let teacher = await Teacher.findOne({ email });
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        // ✅ Ensure subjects exist
        if (!Array.isArray(teacher.subjects)) {
            return res.status(500).json({ message: "Invalid subjects format in database" });
        }

        // ✅ Filter out the subject
        const updatedSubjects = teacher.subjects.filter(subject =>
            !(subject.name === subjectName &&
                subject.year === year &&
                subject.semester === semester &&
                subject.division === division)
        );

        if (updatedSubjects.length === teacher.subjects.length) {
            return res.status(400).json({ message: "Subject not found in teacher's records" });
        }

        teacher.subjects = updatedSubjects;
        await teacher.save();

        res.status(200).json({ message: "Subject removed successfully" });
    } catch (error) {
        console.error("Error in removing subject:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


/** ✅ Fetch Assigned Subjects (Authenticated Teachers Only) */
router.get("/subjects", authMiddleware, async (req, res) => {
    try {
        const email = req.teacher.email;

        let teacher = await Teacher.findOne({ email });
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        res.status(200).json({ subjects: teacher.subjects });
    } catch (error) {
        console.error("Error in fetching subjects:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

/** ✅ Teacher Login */
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        let teacher = await Teacher.findOne({ email });
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        const isMatch = await bcrypt.compare(password, teacher.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { teacherId: teacher._id, email: teacher.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            teacher: {
                name: teacher.name,
                email: teacher.email,
                department: teacher.department,
                subjects: teacher.subjects,
            },
        });
    } catch (error) {
        console.error("Error in teacher login:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

/** ✅ Teacher Dashboard (Protected Route) */
router.get("/dashboard", authMiddleware, async (req, res) => {
    try {
        const email = req.teacher.email;

        let teacher = await Teacher.findOne({ email });
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        res.status(200).json({
            name: teacher.name,
            email: teacher.email,
            department: teacher.department,
            subjects: teacher.subjects,
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

router.get("/teacherslist", authMiddleware, async (req, res) => {
    try {
      const adminId = req.headers["x-admin-id"]; // ✅ Get adminId from headers

      if (!adminId) {
        return res.status(400).json({ message: "Missing Admin ID in request" });
      }

      const teachers = await Teacher.find({ adminId });

      if (!teachers || teachers.length === 0) {
        return res.status(404).json({ message: "No teachers found for this admin." });
      }

      res.status(200).json({ teachers });
    } catch (error) {
      console.error("Error fetching teachers list:", error.message);
      res.status(500).json({ message: "Internal server error." });
    }
});

  
  

module.exports = router;
