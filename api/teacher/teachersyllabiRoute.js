const express = require("express");
const router = express.Router();
const Syllabus = require("../../models/syllabusmodel");
const authMiddleware = require("../../middleware/authmiddleware");
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");

// Get syllabus data for a specific teacher under a specific admin

router.get("/teacher/:adminId", async (req, res) => {
  try {
    const {adminId } = req.params;

    // ✅ Validate input
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ message: "Invalid adminId." });
    }

    // ✅ Convert to ObjectId
    const validAdminId = new mongoose.Types.ObjectId(adminId);

    // ✅ Fetch syllabus data where teacher and admin match
    const syllabi = await Syllabus.find({adminId: validAdminId }).sort({ createdAt: -1 });

    if (!syllabi.length) {
      return res.status(404).json({ message: "No syllabus found for this teacher." });
    }

    res.json(syllabi);
  } catch (error) {
    console.error("Error fetching syllabus data:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});


// ✅ Download a file from GridFS
router.get('/files/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: 'syllabusFiles' });

        // ✅ Ensure fileId is valid
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

module.exports = router;