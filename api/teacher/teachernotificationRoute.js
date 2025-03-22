const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Notification = require("../../models/notificationmodel");

const path = require('path');
const fs = require('fs');
const { GridFSBucket } = require('mongodb');
const multer = require("multer");


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'notificationuploads/'); // Temporary storage before uploading to GridFS
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    },
});

const upload = multer({ storage });
// Get notifications for a specific teacher under a specific admin
router.get("/getteachernotification/:adminId", async (req, res) => {
  try {
    let { adminId } = req.params;

    // Validate adminId
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ message: "Invalid adminId." });
    }

    // Convert to ObjectId
    adminId = new mongoose.Types.ObjectId(adminId);

    // Debugging logs
    console.log("Fetching notifications for adminId:", adminId);

    // Fetch notifications where adminId matches and audience is "all" or "teachers"
    const notifications = await Notification.find({
      adminId,
      audience: { $in: ["all", "teachers"] }
    }).sort({ createdAt: -1 });

    console.log("Found Notifications:", notifications);

    if (!notifications || notifications.length === 0) {
      return res.status(404).json({ message: "No notifications found for this admin and audience." });
    }

    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});




// Create a new notification
router.post("/teacher", async (req, res) => {
  try {
    const { message, audience, fileId, teacherId, adminId } = req.body;

    // Ensure required fields are provided
    if (!teacherId || !adminId || !message || !audience) {
      return res.status(400).json({ message: "All fields (teacherId, adminId, message, audience) are required." });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({ message: "Invalid teacherId format." });
    }
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ message: "Invalid adminId format." });
    }

    // Create new notification
    const newNotification = new Notification({
      message,
      audience,
      fileId: fileId || null, // Ensure fileId is optional
      teacherId: new mongoose.Types.ObjectId(teacherId),
      adminId: new mongoose.Types.ObjectId(adminId),
      createdAt: new Date()
    });

    // Save to database
    await newNotification.save();

    res.status(201).json({
      message: "Notification created successfully",
      notification: newNotification,
    });

  } catch (error) {
    console.error("Error creating teacher notification:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});


// ✅ Upload a notification file to GridFS
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: 'notificationFiles' });

        // ✅ Explicitly set contentType when storing the file
        const uploadStream = bucket.openUploadStream(req.file.originalname, {
            contentType: req.file.mimetype,  // Ensure MIME type is saved
        });

        const fileStream = fs.createReadStream(req.file.path);
        
        await new Promise((resolve, reject) => {
            fileStream.pipe(uploadStream)
                .on('finish', resolve)
                .on('error', reject);
        });

        fs.unlinkSync(req.file.path);
        res.json({ fileID: uploadStream.id });

    } catch (err) {
        console.error('Error uploading file:', err);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});


module.exports = router;