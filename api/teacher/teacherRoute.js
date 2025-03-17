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

/** ✅ Add a New Teacher */
router.post("/add-teacher", async (req, res) => {
    try {
        const { name, email, department, teacherType, division, subjects, adminId } = req.body;

        if (!name || !email || !department || !teacherType || !adminId) {
            return res.status(400).json({ message: "All required fields must be provided." });
        }

        if (teacherType === "subjectTeacher" && (!subjects || subjects.length === 0)) {
            return res.status(400).json({ message: "Subjects are required for subject teachers." });
        }

        // ✅ Generate Random Password & Hash It
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
        await sendEmail(email, randomPassword, name); // Send credentials via email
        return res.status(201).json({ message: "Teacher added successfully", teacher: newTeacher });

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

        if (teacher.isSubjectTeacher) {
            return res.status(400).json({ message: "Teacher is already a Subject Teacher." });
        }

        // ✅ Convert existing Class Teacher into Subject Teacher
        teacher.isSubjectTeacher = true;
        
        // ✅ Merge Existing & New Subjects (Avoid Duplicates)
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
  
      // Remove subject from array
      teacher.subjects = teacher.subjects.filter(
        (subject) =>
          subject.name !== subjectName ||
          subject.year !== year ||
          subject.semester !== semester ||
          subject.division !== division
      );
  
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

router.delete("/delete/:id", async (req, res) => {
    try {
      const { adminId } = req.body;
      const teacherId = req.params.id;
  
      if (!adminId) {
        return res.status(400).json({ message: "Admin ID is required." });
      }
  
      const teacher = await Teacher.findOneAndDelete({ _id: teacherId, adminId });
  
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found or unauthorized." });
      }
  
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

            // ✅ Update existing teacher to be both Class & Subject Teacher
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



  

module.exports = router;