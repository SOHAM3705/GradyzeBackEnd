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

router.get('/files/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: 'syllabusFiles' });

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

router.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.body;

  try {
    const syllabus = await Syllabus.findById(id);

    if (!syllabus) {
      return res.status(404).json({ message: 'Syllabus not found' });
    }

    if (syllabus.adminId.toString() !== adminId) {
      return res.status(403).json({ message: 'Unauthorized to delete this syllabus' });
    }

    await Syllabus.findByIdAndDelete(id);
    res.status(200).json({ message: 'Syllabus deleted successfully' });
  } catch (error) {
    console.error('Error deleting syllabus:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;


module.exports = router;
