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
const Teacher = require("../../models/teacheraccount"); // Collection: "teachers"

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

/* ✅ Fetch Profile (Specific to Logged-in User) */
router.get("/profile", verifyToken, async (req, res) => {
    try {
        const profile = await User.findOne({ email: req.adminEmail }).lean();
        if (!profile) {
            console.error("❌ Profile not found for email:", req.adminEmail);
            return res.status(404).json({ error: "Profile not found" });
        }

        console.log("✅ Fetched Profile for:", req.adminEmail);

        const profilePhotoUrl = profile.profilePhotoId
            ? `/api/teacher/profile/photo/${profile.profilePhotoId}`
            : "/profile.png"; // Default profile picture

        res.json({ ...profile, profilePhotoUrl });
    } catch (err) {
        console.error("❌ Error fetching profile:", err);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

/* ✅ Fetch Teacher Name */
router.get("/teacher-name", verifyToken, async (req, res) => {
    try {
        const teacher = await User.findOne({ email: req.adminEmail }).lean();

        if (!teacher || !teacher.name) {
            console.error("❌ Teacher profile not found for email:", req.adminEmail);
            return res.status(404).json({ error: "Teacher profile not found" });
        }

        console.log("✅ Fetched Teacher Name for:", req.adminEmail);
        res.json({ teacherName: teacher.name });
    } catch (err) {
        console.error("❌ Error fetching teacher name:", err);
        res.status(500).json({ error: "Failed to fetch teacher name" });
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


/* ✅ Upload Profile Picture */
router.post("/profile/upload", upload.single("file"), async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required" });
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: "profilePhotos" });

        const uploadStream = bucket.openUploadStream(req.file.originalname, {
            contentType: req.file.mimetype,
        });

        const fileStream = fs.createReadStream(req.file.path);
        fileStream.pipe(uploadStream);

        uploadStream.on("finish", async () => {
            fs.unlinkSync(req.file.path);

            const updatedUser = await User.findOneAndUpdate(
                { email },
                { profilePhotoId: uploadStream.id },
                { new: true }
            );

            if (!updatedUser) return res.status(404).json({ error: "User not found" });

            console.log("✅ Profile photo uploaded and updated in DB:", updatedUser);
            res.json({ success: true, fileID: uploadStream.id, profilePhotoUrl: `/api/admin/profile/photo/${uploadStream.id}` });
        });

    } catch (err) {
        console.error("❌ Error uploading profile photo:", err);
        res.status(500).json({ error: "Failed to upload profile photo" });
    }
});

/* ✅ Fetch Profile Picture */
router.get("/profile/photo/:fileId", async (req, res) => {
    try {
        const { fileId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({ error: "Invalid file ID" });
        }

        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: "profilePhotos" });

        const fileCursor = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
        if (!fileCursor || fileCursor.length === 0) {
            return res.status(404).json({ error: "File not found" });
        }

        const file = fileCursor[0];
        if (!file.contentType) {
            return res.status(500).json({ error: "File content type is missing" });
        }

        console.log(`✅ Fetching Profile Photo: ${fileId} (Type: ${file.contentType})`);

        res.setHeader("Content-Type", file.contentType);
        bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId)).pipe(res);

    } catch (err) {
        console.error("❌ Error fetching profile photo:", err);
        res.status(500).json({ error: "Failed to fetch profile photo" });
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

        // ✅ Find the teacher user & explicitly select password
        const teacher = await Teacher.findOne({ email }).select("+password");

        if (!teacher) {
            return res.status(404).json({ error: "Teacher not found" });
        }

        // ✅ Ensure we have a valid password to compare
        if (!teacher.password) {
            return res.status(400).json({ error: "No password set for this teacher" });
        }

        // ✅ Validate current password
        const isMatch = await bcrypt.compare(currentPassword, teacher.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Incorrect current password" });
        }

        // ✅ Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // ✅ Update password ONLY in Teacher collection
        teacher.password = hashedNewPassword;
        await teacher.save();

        console.log("✅ Teacher Password Changed for:", email);
        res.json({ success: true, message: "Password changed successfully! Please log in again." });

    } catch (err) {
        console.error("❌ Error changing password:", err);
        res.status(500).json({ error: "Failed to change password" });
    }
});

module.exports = router;