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

const emailContent = require("../../utils/newaccount");

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

/** ✅ Add Teacher or Update Existing */
router.post("/add-teacher-subject", async (req, res) => {
    try {
        const { teacherId, name, email, department, teacherType, division, subjects, adminId } = req.body;

        if (!name || !email || !department || !teacherType || !adminId) {
            return res.status(400).json({ message: "All required fields must be provided" });
        }

        let existingTeacher = teacherId 
            ? await Teacher.findOne({ _id: teacherId, adminId }) 
            : await Teacher.findOne({ email, adminId });

        if (teacherId && !existingTeacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        if (existingTeacher) {
            if (teacherType === "subjectTeacher") {
                if (!subjects || subjects.length === 0) {
                    return res.status(400).json({ message: "Subjects are required for subject teachers." });
                }
                
                // Validate each subject
                for (let subject of subjects) {
                    if (!subject.name || !subject.year || !subject.semester || !subject.division) {
                        return res.status(400).json({ message: "Each subject must include name, year, semester, and division." });
                    }
                }

                existingTeacher.subjects = mergeSubjects(existingTeacher.subjects, subjects);
            } else {
                existingTeacher.division = division;
            }
            
            await existingTeacher.save();
            return res.status(200).json({ message: "Teacher updated successfully", teacher: existingTeacher });
        }

        // Create new teacher if not found
        if (teacherType === "subjectTeacher" && (!subjects || subjects.length === 0)) {
            return res.status(400).json({ message: "Subjects are required for subject teachers." });
        }

        // Validate new subjectTeacher subjects
        if (teacherType === "subjectTeacher") {
            for (let subject of subjects) {
                if (!subject.name || !subject.year || !subject.semester || !subject.division) {
                    return res.status(400).json({ message: "Each subject must include name, year, semester, and division." });
                }
            }
        }

        const randomPassword = crypto.randomBytes(6).toString("hex");
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        
        const newTeacher = new Teacher({
            name,
            email,
            password: hashedPassword,
            department,
            teacherType,
            division: teacherType === "classTeacher" ? division : undefined,
            subjects: teacherType === "subjectTeacher" ? subjects : undefined,
            adminId,
        });

        await newTeacher.save();
        await sendEmail(email, randomPassword, name);
        return res.status(201).json({ message: "Teacher added successfully", teacher: newTeacher });

    } catch (error) {
        console.error("Error in adding/updating teacher:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

/** ✅ Remove Teacher */
router.delete("/remove-teacher", async (req, res) => {
    try {
        const { email, adminId } = req.body;
        if (!email || !adminId) {
            return res.status(400).json({ message: "Email and Admin ID are required." });
        }

        const teacher = await Teacher.findOneAndDelete({ email, adminId });
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found." });
        }

        return res.status(200).json({ message: "Teacher removed successfully." });
    } catch (error) {
        console.error("Error in removing teacher:", error);
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


/** ✅ Fetch Assigned Subjects */
router.get("/subjects", authMiddleware, async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ email: req.teacher.email });
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }
        res.status(200).json({ subjects: teacher.subjects });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
});

/** ✅ Teacher Login */
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        let teacher = await Teacher.findOne({ email });
        if (!teacher || !(await bcrypt.compare(password, teacher.password))) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const token = jwt.sign({ teacherId: teacher._id, email: teacher.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.status(200).json({
            message: "Login successful",
            token,
            teacher: {
                name: teacher.name,
                email: teacher.email,
                department: teacher.department,
                teacherType: teacher.teacherType,
                division: teacher.division,
                subjects: teacher.subjects,
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
});


module.exports = router;