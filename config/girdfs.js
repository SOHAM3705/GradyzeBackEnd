const mongoose = require('mongoose');
const gridfsStream = require('gridfs-stream');
const { GridFsStorage } = require('multer-gridfs-storage');
const multer = require('multer');
require('dotenv').config(); // Load environment variables

// Define a variable to hold the GridFS instance
let gfs;

// Initialize GridFS stream
const initGridFS = () => {
  const db = mongoose.connection.db;
  gfs = gridfsStream(db, mongoose.mongo);
  gfs.collection('uploadsyllabus'); // Collection to store the files
};

// Function to get the GridFS instance
const getGridFS = () => gfs;

// Setup Multer storage engine for GridFS
const storage = new GridFsStorage({
  url: process.env.MONGO_URI, // MongoDB connection URI
  file: async (req, file) => {
    return {
      filename: `${Date.now()}_${file.originalname}`, // Unique filename with timestamp
      bucketName: 'syllabusFiles', // Collection in GridFS
      metadata: req.body.metadata || null, // Optional metadata
    };
  },
});

// Create multer instance with storage engine
const upload = multer({ storage });

// Function to handle file upload to GridFS
const uploadFile = (req, res) => {
  const singleUpload = upload.single('file'); // 'file' is the field name in the form

  singleUpload(req, res, (err) => {
    if (err) {
      return res.status(500).json({ message: 'Error uploading file', error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    return res.status(200).json({
      message: 'File uploaded successfully',
      fileID: req.file.id, // File ID in GridFS
      filename: req.file.filename, // File name in GridFS
    });
  });
};

module.exports = { initGridFS, getGridFS, storage, uploadFile };
