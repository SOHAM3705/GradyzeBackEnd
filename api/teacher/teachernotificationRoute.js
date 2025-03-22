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
router.get("/teacher/:adminId", async (req, res) => {
  try {
    let { adminId } = req.params;

    // Check if adminId is valid
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ message: "Invalid adminId." });
    }

    // Convert adminId to ObjectId
    adminId = new mongoose.Types.ObjectId(adminId);

    // Debugging log
    console.log("Fetching notifications for adminId:", adminId);

    // Fetch notifications
    const notifications = await Notification.find({ adminId }).sort({ createdAt: -1 });

    // Log fetched notifications
    console.log("Found Notifications:", notifications);

    // If no notifications found, return 404
    if (!notifications || notifications.length === 0) {
      return res.status(404).json({ message: "No notifications found for this admin." });
    }

    // Return notifications
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

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(teacherId) || !mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ message: "Invalid teacherId or adminId format." });
    }

    const newNotification = new Notification({
      message,
      audience,
      fileId,
      teacherId,
      adminId,
      createdAt: new Date()
    });

    await newNotification.save();
    res.status(201).json(newNotification);
  } catch (error) {
    console.error("Error creating notification:", error);
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