const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Teacher = require("../../models/teacheraccount");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const axios = require("axios");
const authMiddleware = require("../../middleware/authmiddleware");

dotenv.config();

/** ✅ Function to Merge Subjects */
const mergeSubjects = (existingSubjects, newSubjects) => {
    const uniqueSubjects = new Map();

    // ✅ Add existing subjects
    existingSubjects.forEach(sub => {
        uniqueSubjects.set(`${sub.name}-${sub.year}-${sub.semester}-${sub.division}`, sub);
    });

    // ✅ Add new subjects (only if not duplicate)
    newSubjects.forEach(sub => {
        const key = `${sub.name}-${sub.year}-${sub.semester}-${sub.division}`;
        if (!uniqueSubjects.has(key)) {
            uniqueSubjects.set(key, sub);
        }
    });

    return Array.from(uniqueSubjects.values());
};


const emailContent = require("../../utils/newaccount");

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

router.post("/add-teacher", async (req, res) => {
    try {
        const { name, email, department, isClassTeacher, assignedClass, isSubjectTeacher, subjects, adminId } = req.body;

        if (!name || !email || !department || !adminId) {
            return res.status(400).json({ message: "All required fields must be provided." });
        }

        if (isSubjectTeacher && (!subjects || subjects.length === 0)) {
            return res.status(400).json({ message: "Subjects are required for subject teachers." });
        }

        if (isClassTeacher && (!assignedClass || !assignedClass.year || !assignedClass.division)) {
            return res.status(400).json({ message: "Assigned class details are required for class teachers." });
        }

        // ✅ Generate Password
        const randomPassword = crypto.randomBytes(6).toString("hex");
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        const newTeacher = new Teacher({
            name,
            email,
            password: hashedPassword,
            department,
            isClassTeacher,
            assignedClass: isClassTeacher ? assignedClass : undefined,
            isSubjectTeacher,
            subjects: isSubjectTeacher ? subjects : [],
            adminId,
        });

        await newTeacher.save();
        await sendEmail(email, randomPassword, name);

        return res.status(201).json({ message: "Teacher added successfully!", teacher: newTeacher });

    } catch (error) {
        console.error("Error in adding teacher:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});


router.post("/add-subject", async (req, res) => {
    try {
        const { teacherId, subjects, adminId } = req.body;

        if (!teacherId || !adminId || !subjects || subjects.length === 0) {
            return res.status(400).json({ message: "Teacher ID, Admin ID, and subjects are required." });
        }

        let teacher = await Teacher.findOne({ _id: teacherId, adminId });

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        // ✅ Convert existing teacher to Subject Teacher if not already
        if (!teacher.isSubjectTeacher) {
            teacher.isSubjectTeacher = true;
        }

        // ✅ Merge existing and new subjects (Avoid duplicates)
        teacher.subjects = mergeSubjects(teacher.subjects || [], subjects);

        await teacher.save();
        return res.status(200).json({ message: "Teacher is now also a Subject Teacher!", teacher });

    } catch (error) {
        console.error("Error adding subject:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});


router.post("/remove-subject", async (req, res) => {
    try {
        const { teacherId, subjectName, year, semester, division, adminId } = req.body;

        if (!teacherId || !subjectName || !year || !semester || !division || !adminId) {
            return res.status(400).json({ message: "All required fields must be provided." });
        }

        const teacher = await Teacher.findOne({ _id: teacherId, adminId });

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found or unauthorized." });
        }

        // ✅ Remove subject
        teacher.subjects = teacher.subjects.filter(
            (subject) =>
                subject.name !== subjectName ||
                subject.year !== year ||
                subject.semester !== semester ||
                subject.division !== division
        );

        // ✅ If no subjects left, remove Subject Teacher role
        if (teacher.subjects.length === 0) {
            teacher.isSubjectTeacher = false;
        }

        await teacher.save();
        res.status(200).json({ message: "Subject removed successfully!" });

    } catch (error) {
        console.error("Error removing subject:", error);
        res.status(500).json({ message: "Internal Server Error." });
    }
});
  

/** ✅ Fetch All Teachers */
router.get("/teacherslist", async (req, res) => {
    try {
        const adminId = req.query.adminId || req.headers.adminid;
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized: No admin ID provided" });
        }
        const teachers = await Teacher.find({ adminId });
        if (!teachers.length) {
            return res.status(404).json({ message: "No teachers found" });
        }
        res.status(200).json({ teachers });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
});


router.get("/subjects", authMiddleware, async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ email: req.teacher.email });

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        let responseData = {};

        if (teacher.isSubjectTeacher) {
            responseData.subjects = teacher.subjects;
        }

        if (teacher.isClassTeacher && teacher.assignedClass) {
            responseData.assignedClass = teacher.assignedClass;
        }

        if (!teacher.isSubjectTeacher && !teacher.isClassTeacher) {
            return res.status(400).json({ message: "This teacher is neither a subject teacher nor a class teacher." });
        }

        res.status(200).json(responseData);
    } catch (error) {
        console.error("Error fetching subjects:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        let teacher = await Teacher.findOne({ email });

        if (!teacher || !(await bcrypt.compare(password, teacher.password))) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // ✅ FIXED: Use `teacher` instead of `user`
        const token = jwt.sign(
            { id: teacher._id, email: teacher.email, role: "teacher" }, // Explicitly set role
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            teacher: {
                _id: teacher._id,  // ✅ Ensure teacherId is included
                name: teacher.name,
                email: teacher.email,
                department: teacher.department,
                isClassTeacher: teacher.isClassTeacher,
                isSubjectTeacher: teacher.isSubjectTeacher,
                assignedClass: teacher.isClassTeacher ? teacher.assignedClass : null,
                subjects: teacher.isSubjectTeacher ? teacher.subjects : [],
                adminId: teacher.adminId ? teacher.adminId.toString() : null

            },
        });
    } catch (error) {
        console.error("Login Error:", error); // ✅ Log error for debugging
        res.status(500).json({ message: "Internal Server Error" });
    }
});



router.delete("/delete/:id", async (req, res) => {
    try {
        const { adminId } = req.body;
        const teacherId = req.params.id;

        if (!adminId) {
            return res.status(400).json({ message: "Admin ID is required." });
        }

        const teacher = await Teacher.findOne({ _id: teacherId, adminId });

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found or unauthorized." });
        }

        await Teacher.findByIdAndDelete(teacherId);

        res.status(200).json({ message: "Teacher deleted successfully!" });
    } catch (error) {
        console.error("Error deleting teacher:", error);
        res.status(500).json({ message: "Internal Server Error." });
    }
});

  router.post("/add-class-teacher", async (req, res) => {
    try {
        const { name, email, department, assignedClass, adminId } = req.body;

        if (!name || !email || !department || !adminId || !assignedClass?.year || !assignedClass?.division) {
            return res.status(400).json({ message: "All required fields must be provided." });
        }

        let teacher = await Teacher.findOne({ email, adminId });

        if (teacher) {
            if (teacher.isClassTeacher) {
                return res.status(400).json({ message: "Teacher is already a Class Teacher." });
            }

            // ✅ Update existing teacher to also be a Class Teacher
            teacher.isClassTeacher = true;
            teacher.assignedClass = assignedClass;
            await teacher.save();

            return res.status(200).json({ message: "Teacher is now also a Class Teacher!", teacher });
        }

        // ✅ Create a new Class Teacher
        const randomPassword = crypto.randomBytes(6).toString("hex");
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        const newTeacher = new Teacher({
            name,
            email,
            password: hashedPassword,
            department,
            isClassTeacher: true,
            assignedClass,
            adminId,
        });

        await newTeacher.save();
        await sendEmail(email, randomPassword, name);

        return res.status(201).json({ message: "Class Teacher added successfully!", teacher: newTeacher });

    } catch (error) {
        console.error("Error in adding class teacher:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});


// Endpoint to remove the assigned class
router.post('/remove-class', authMiddleware, async (req, res) => {
  try {
    const { teacherId, adminId } = req.body;

    // Find the teacher by ID and admin ID
    const teacher = await Teacher.findOne({ _id: teacherId, adminId });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found.' });
    }

    // Remove the assigned class information
    teacher.assignedClass = null;
    teacher.isClassTeacher = false;

    // Save the updated teacher record
    await teacher.save();

    res.status(200).json({ message: 'Class removed successfully.' });
  } catch (error) {
    console.error('Error removing class:', error);
    res.status(500).json({ message: 'Failed to remove class.' });
  }
});

module.exports = router;

  

module.exports = router;