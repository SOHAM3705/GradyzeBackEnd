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

// ✅ Fetch all syllabi with file details populated
router.get('/api/syllabi', async (req, res) => {
    try {
        const syllabi = await Syllabus.find().sort({ createdAt: -1 }); // Latest first

        console.log("Fetched syllabi from MongoDB:", syllabi); // Debugging

        if (!syllabi || syllabi.length === 0) {
            return res.status(404).json({ error: "No syllabi found" });
        }

        res.json(syllabi.map((syllabus) => ({
            _id: syllabus._id,
            stream: syllabus.stream,
            pattern: syllabus.pattern,
            year: syllabus.year,
            fileId: syllabus.fileId || null,
            createdAt: syllabus.createdAt,
        })));
    } catch (err) {
        console.error("Error fetching syllabi:", err);
        res.status(500).json({ error: "Failed to fetch syllabi" });
    }
});

// ✅ Create a new syllabus entry with a file reference
router.post('/api/syllabi', async (req, res) => {
    try {
        const { stream, pattern, year, fileId } = req.body;
        const newSyllabus = new Syllabus({ stream, pattern, year, fileId });

        const savedSyllabus = await newSyllabus.save();
        res.json(savedSyllabus);
    } catch (err) {
        console.error('Error creating syllabus:', err);
        res.status(500).json({ error: 'Failed to create syllabus' });
    }
});

// ✅ Upload a syllabus file to GridFS
router.post('/api/syllabus/upload', upload.single('file'), async (req, res) => {
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

// ✅ Download a file from GridFS
router.get('/api/syllabus/files/:fileId', async (req, res) => {
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
