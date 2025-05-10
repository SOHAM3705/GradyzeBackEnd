const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/adminsettingmodel"); // Collection: "users"
const { GridFSBucket } = require("mongodb");
const fs = require("fs");
const path = require("path");
const verifyToken = require("../../middleware/settingauth"); // ✅ Middleware for authentication
const Student = require("../../models/studentModel"); // Collection: "students"

const router = express.Router();

// ✅ Configure Multer for temporary storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

/* ✅ Fetch Profile */
router.get("/profile", verifyToken, async (req, res) => {
    try {
        const profile = await Student.findOne({ email: req.studentEmail }).lean();
        if (!profile) {
            return res.status(404).json({ error: "Profile not found" });
        }

        const profilePhotoUrl = profile.profilePhotoId
            ? `/api/studentsetting/profile/photo/${profile.profilePhotoId}`
            : "/profile.png";

        res.json({ ...profile, profilePhotoUrl });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

/* ✅ Upload Profile Picture */
router.post("/profile/upload", verifyToken, upload.single("file"), async (req, res) => {
    try {
        const email = req.studentEmail; // Get from token instead of body
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: "studentProfilePhotos" }); // Different bucket

        const uploadStream = bucket.openUploadStream(req.file.originalname, {
            contentType: req.file.mimetype,
        });

        fs.createReadStream(req.file.path).pipe(uploadStream);

        uploadStream.on("finish", async () => {
            fs.unlinkSync(req.file.path);
            await Student.findOneAndUpdate(
                { email },
                { profilePhotoId: uploadStream.id },
                { new: true }
            );
            res.json({ 
                success: true, 
                fileID: uploadStream.id, 
                profilePhotoUrl: `/api/studentsetting/profile/photo/${uploadStream.id}`
            });
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to upload profile photo" });
    }
});

/* ✅ Fetch Profile Picture */
router.get("/profile/photo/:fileId", async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: "studentProfilePhotos" }); // Consistent bucket
        
        const fileId = new mongoose.Types.ObjectId(req.params.fileId);
        const [file] = await bucket.find({ _id: fileId }).toArray();
        
        if (!file) return res.status(404).json({ error: "File not found" });
        
        res.set("Content-Type", file.contentType);
        bucket.openDownloadStream(fileId).pipe(res);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch profile photo" });
    }
});

/* ✅ Fetch Student Name */
router.get("/student-name", verifyToken, async (req, res) => {
    try {
        const student = await User.findOne({ email: req.adminEmail }).lean();

        if (!student || !student.name) {
            console.error("❌ Student profile not found for email:", req.adminEmail);
            return res.status(404).json({ error: "Student profile not found" });
        }

        console.log("✅ Fetched Student Name for:", req.adminEmail);
        res.json({ studentName: student.name });
    } catch (err) {
        console.error("❌ Error fetching student name:", err);
        res.status(500).json({ error: "Failed to fetch student name" });
    }
});

/* ✅ Update Name & Email */
router.post("/update-name-email", verifyToken, async (req, res) => {
    try {
        const { newEmail, name } = req.body;
        if (!newEmail || !name) return res.status(400).json({ error: "New email and name are required" });

        // ✅ Find and update the user
        const updatedUser = await User.findOneAndUpdate(
            { email: req.adminEmail },  // ✅ Use email from token
            { email: newEmail, name },
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ error: "User not found" });

        console.log(`✅ Name & Email Updated: ${req.adminEmail} → ${newEmail}, Name: ${name}`);
        res.json({ success: true, message: "Updated successfully" });

    } catch (err) {
        console.error("❌ Error updating name and email:", err);
        res.status(500).json({ error: "Failed to update name and email" });
    }
});




/* ✅ Change Password */
router.post("/change-password", verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const email = req.adminEmail; // ✅ Get email from token

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Both current and new passwords are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: "New password must be at least 6 characters long" });
        }

        // ✅ Find the student user & explicitly select password
        const student = await Student.findOne({ email }).select("+password");

        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        // ✅ Ensure we have a valid password to compare
        if (!student.password) {
            return res.status(400).json({ error: "No password set for this student" });
        }

        // ✅ Validate current password
        const isMatch = await bcrypt.compare(currentPassword, student.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Incorrect current password" });
        }

        // ✅ Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // ✅ Update password ONLY in Student collection
        student.password = hashedNewPassword;
        await student.save();

        console.log("✅ Student Password Changed for:", email);
        res.json({ success: true, message: "Password changed successfully! Please log in again." });

    } catch (err) {
        console.error("❌ Error changing password:", err);
        res.status(500).json({ error: "Failed to change password" });
    }
});

module.exports = router;