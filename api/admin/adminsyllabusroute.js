const express = require('express');
const multer = require("multer");
const mongoose = require('mongoose');
const router = express.Router();
const Syllabus = require('../../models/syllabusmodel');
const path = require('path');
const fs = require('fs');
const { GridFSBucket } = require('mongodb');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Temporary storage before uploading to GridFS
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    },
});

const upload = multer({ storage });

router.get("/getsyllabi/:adminId", async (req, res) => {
    try {
        const { adminId } = req.params; // ✅ Get adminId from URL params

        if (!mongoose.Types.ObjectId.isValid(adminId)) {
            return res.status(400).json({ error: "Invalid adminId format" });
        }

        const syllabi = await Syllabus.find({ adminId: new mongoose.Types.ObjectId(adminId) }).sort({ createdAt: -1 });

        console.log(`Fetched syllabi for admin ${adminId}:`, syllabi); // Debugging

        if (!syllabi.length) {
            return res.status(404).json({ error: "No syllabi found for this admin" });
        }

        res.json(syllabi);
    } catch (err) {
        console.error("Error fetching syllabi:", err);
        res.status(500).json({ error: "Failed to fetch syllabi" });
    }
});

// ✅ Create a new syllabus entry with a file reference
router.post('/putsyllabi', async (req, res) => {
    try {
        const { stream, pattern, year, fileId, adminId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(adminId)) {
            return res.status(400).json({ error: "Invalid adminId format" });
        }

        const newSyllabus = new Syllabus({ 
            stream, 
            pattern, 
            year, 
            fileId, 
            adminId: new mongoose.Types.ObjectId(adminId) 
        });

        const savedSyllabus = await newSyllabus.save();
        res.json(savedSyllabus);
    } catch (err) {
        console.error('Error creating syllabus:', err);
        res.status(500).json({ error: 'Failed to create syllabus' });
    }
});

// ✅ Upload a syllabus file to GridFS
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: 'syllabusFiles' });

        // ✅ Store file with correct contentType
        const uploadStream = bucket.openUploadStream(req.file.originalname, {
            contentType: req.file.mimetype,
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

router.get("/files/:fileId", async (req, res) => {
    try {
        const { fileId } = req.params;

        if (!fileId) {
            return res.status(400).json({ error: "File ID is required" });
        }

        const gfs = getGridFS("syllabus"); // ✅ Get GridFSBucket for syllabus files

        if (!gfs) {
            return res.status(500).json({ error: "GridFS not initialized" });
        }

        // ✅ Check if file exists in GridFS
        const files = await mongoose.connection.db.collection("syllabusFiles.files").findOne({ _id: new mongoose.Types.ObjectId(fileId) });

        if (!files) {
            return res.status(404).json({ error: "File not found in GridFS" });
        }

        const fileStream = gfs.openDownloadStream(new mongoose.Types.ObjectId(fileId));

        fileStream.on("error", (err) => {
            console.error("GridFS Stream Error:", err);
            return res.status(500).json({ error: "Error reading file" });
        });

        res.set("Content-Type", "application/pdf"); // ✅ Set correct content type
        fileStream.pipe(res);
    } catch (err) {
        console.error("Error fetching file:", err);
        res.status(500).json({ error: "Failed to fetch file" });
    }
});

module.exports = router;
