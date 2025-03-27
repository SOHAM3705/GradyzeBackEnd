const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Notification = require("../../models/notificationmodel");
const { GridFSBucket } = require("mongodb");

// ✅ Fetch notifications only for students (including file IDs)
router.get("/notifications", async (req, res) => {
    console.log("✅ Notifications API hit!"); // Debugging
    try {
        const notifications = await Notification.find({
            audience: { $in: ["students", "all"] }
        }).sort({ createdAt: -1 });

        if (!Array.isArray(notifications)) {
            return res.json([]);
        }

        res.json(
            notifications.map((notif) => ({
                _id: notif._id,
                message: notif.message,
                audience: notif.audience,
                fileId: notif.fileId || null,
                createdAt: notif.createdAt,
            }))
        );
    } catch (err) {
        console.error("❌ Error fetching student notifications:", err);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
});

// ✅ Download a file from GridFS (if attached to a notification)
router.get("/files/:fileId", async (req, res) => {
    try {
        const { fileId } = req.params;
        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: "notificationFiles" });

        // ✅ Ensure fileId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            console.error(`Invalid ObjectId: ${fileId}`);
            return res.status(400).json({ error: "Invalid file ID" });
        }

        // ✅ Fetch file metadata
        const fileCursor = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();

        if (!fileCursor || fileCursor.length === 0) {
            console.error(`Error: File with ID ${fileId} not found.`);
            return res.status(404).json({ error: "File not found" });
        }

        const file = fileCursor[0];

        // ✅ Ensure contentType exists before using it
        if (!file || !file.contentType) {
            console.error(`Error: contentType is missing for file: ${file.filename}`);
            return res.status(500).json({ error: "File content type is missing" });
        }

        // ✅ Set proper headers
        res.setHeader("Content-Type", file.contentType);
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.filename)}"`);

        // ✅ Stream file to response
        const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
        downloadStream.pipe(res);

    } catch (err) {
        console.error("Error downloading file:", err);
        res.status(500).json({ error: "Failed to download file" });
    }
});

module.exports = router;
