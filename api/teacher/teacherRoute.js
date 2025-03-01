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
        const { teacherId, name, email, department, subjects, adminId } = req.body;

        // ✅ Validate required fields
        if (!name || !email || !department || !subjects || !adminId) {
            return res.status(400).json({ message: "All fields are required" });
        }

        let existingTeacher;

        if (teacherId) {
            // ✅ Find teacher by ID (if provided)
            existingTeacher = await Teacher.findOne({ _id: teacherId, adminId });
        } else {
            // ✅ Check if a teacher with the same email already exists under the same admin
            existingTeacher = await Teacher.findOne({ email, adminId });
        }

        if (existingTeacher) {
            // ✅ Update existing teacher's subjects
            existingTeacher.subjects = mergeSubjects(existingTeacher.subjects, subjects);
            await existingTeacher.save();
            return res.status(200).json({ message: "Subjects updated successfully", teacher: existingTeacher });
        }

        // ✅ Generate a random password for new teachers
        const randomPassword = crypto.randomBytes(6).toString("hex");
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        // ✅ Create new teacher
        const newTeacher = new Teacher({
            name,
            email,
            password: hashedPassword,
            department,
            subjects,
            adminId,
        });

        await newTeacher.save();
        await sendEmail(email, randomPassword, name);

        return res.status(201).json({
            message: "Teacher added successfully, credentials sent via email",
            teacher: newTeacher,  // Return the full teacher object
        });

    } catch (error) {
        console.error("❌ Error in adding/updating teacher:", error.message, error.stack);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});


/** ✅ Remove Subject */
router.post("/remove-subject", async (req, res) => {
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

/** ✅ Protected Route (Example) */
router.get("/dashboard", authMiddleware, async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.teacher.teacherId).select("-password");
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        res.status(200).json({ message: "Access granted", teacher });
    } catch (error) {
        console.error("Error in dashboard route:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


/** ✅ Fetch Teachers List (Admin Only) */
router.get("/teacherslist", authMiddleware, async (req, res) => {
    try {
        const { adminId } = req.user; // Extract adminId from the decoded token (from authMiddleware)

        // Fetch teachers associated with the adminId
        const teachers = await Teacher.find({ adminId });

        // If no teachers are found, return 404
        if (teachers.length === 0) {
            return res.status(404).json({ message: "No teachers found for this admin." });
        }

        // Format the teachers list with necessary details
        const formattedTeachers = teachers.map((teacher) => ({
            teacherId: teacher._id, // Use _id as teacherId
            name: teacher.name,
            email: teacher.email,
            department: teacher.department,
            subjects: Array.isArray(teacher.subjects) ? teacher.subjects : [], // Ensure subjects is an array
        }));

        // Return the formatted teachers list with a 200 status
        return res.status(200).json({ teachers: formattedTeachers });

    } catch (error) {
        console.error("Error fetching teachers list:", error.stack); // Log full stack for debugging
        return res.status(500).json({ message: "Internal server error." });
    }
});


module.exports = router;
