const express = require('express');
const multer = require("multer");
const mongoose = require('mongoose');
const router = express.Router();
const Notification = require('../../models/notificationmodel');
const path = require('path');
const fs = require('fs');
const { GridFSBucket } = require('mongodb');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'notificationuploads/'); // Temporary storage before uploading to GridFS
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    },
});

const upload = multer({ storage });

router.get("/getnotificationlist/:adminId", async (req, res) => {
    try {
      const { adminId } = req.params; // ✅ Get adminId from request URL
  
      if (!adminId) {
        return res.status(400).json({ error: "Admin ID is required" });
      }
  
      const notifications = await Notification.find({ adminId }) // ✅ Fetch only this admin's notifications
        .sort({ createdAt: -1 });
  
      res.json(notifications);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });


router.post("/createnotification", async (req, res) => {
    try {
      const { message, audience, fileId, adminId, teacherId } = req.body; 
  
      // Ensure either adminId or teacherId is provided
      if (!adminId && !teacherId) {
        return res.status(400).json({ error: "Either adminId or teacherId is required." });
      }
  
      // Validate ObjectIds
      if (adminId && !mongoose.Types.ObjectId.isValid(adminId)) {
        return res.status(400).json({ error: "Invalid adminId format." });
      }
      if (teacherId && !mongoose.Types.ObjectId.isValid(teacherId)) {
        return res.status(400).json({ error: "Invalid teacherId format." });
      }
  
      // Create new notification
      const newNotification = new Notification({
        message,
        audience,
        fileId: fileId || null,
        adminId: adminId ? new mongoose.Types.ObjectId(adminId) : null,
        teacherId: teacherId ? new mongoose.Types.ObjectId(teacherId) : null,
      });
  
      // Save to database
      const savedNotification = await newNotification.save();
      res.json(savedNotification);
      res.status(201).json({ message: "Notification created successfully", notification: savedNotification });
  
    } catch (err) {
      console.error("Error creating notification:", err);
      res.status(500).json({ error: "Failed to create notification" });
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

// ✅ Download a file from GridFS
router.get('/files/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: 'notificationFiles' });

        // ✅ Ensure fileId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            console.error(`Invalid ObjectId: ${fileId}`);
            return res.status(400).json({ error: 'Invalid file ID' });
        }

        // ✅ Fetch file metadata
        const fileCursor = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();

        if (!fileCursor || fileCursor.length === 0) {
            console.error(`Error: File with ID ${fileId} not found.`);
            return res.status(404).json({ error: 'File not found' });
        }

        const file = fileCursor[0];

        // ✅ Ensure contentType exists before using it
        if (!file || !file.contentType) {
            console.error(`Error: contentType is missing for file: ${file.filename}`);
            return res.status(500).json({ error: "File content type is missing" });
        }

        // ✅ Set proper headers
        res.setHeader('Content-Type', file.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);

        // ✅ Stream file to response
        const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
        downloadStream.pipe(res);

    } catch (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

// Delete a notification
router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;
    const { adminId } = req.body;
  
    try {
      const notification = await Notification.findById(id);
  
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }
  
      if (notification.adminId.toString() !== adminId) {
        return res.status(403).json({ message: 'Unauthorized to delete this notification' });
      }
  
      await Notification.findByIdAndDelete(id);
      res.status(200).json({ message: 'Notification deleted successfully' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

module.exports = router;
