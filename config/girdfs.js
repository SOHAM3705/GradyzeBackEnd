const mongoose = require('mongoose');
const { GridFsStorage } = require('multer-gridfs-storage');
const multer = require('multer');
require('dotenv').config();

let gfs_syllabus, gfs_notifications;

// ✅ Initialize GridFS when DB connects
mongoose.connection.once("open", () => {
  const db = mongoose.connection.db;
  
  gfs_syllabus = new mongoose.mongo.GridFSBucket(db, { bucketName: 'syllabusFiles' });
  gfs_notifications = new mongoose.mongo.GridFSBucket(db, { bucketName: 'notificationFiles' });

  console.log("✅ GridFS initialized for syllabus and notifications!");
});

// ✅ Function to get GridFS instances
const getGridFS = (type) => {
  if (type === "syllabus") return gfs_syllabus;
  if (type === "notifications") return gfs_notifications;
  return null;
};

// ✅ Dynamic Storage for Syllabus & Notifications
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: async (req, file) => {
    const type = req.body.type || "syllabus"; // Default to syllabus
    return {
      filename: `${Date.now()}_${file.originalname}`,
      bucketName: type === "notifications" ? "notificationFiles" : "syllabusFiles",
      metadata: req.body.metadata || null,
    };
  },
});

// ✅ Multer Upload Config
const upload = multer({ storage });

// ✅ Unified File Upload Function
const uploadFile = (req, res) => {
  const singleUpload = upload.single('file'); 

  singleUpload(req, res, (err) => {
    if (err) {
      return res.status(500).json({ message: 'Error uploading file', error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    return res.status(200).json({
      message: 'File uploaded successfully',
      fileID: req.file.id,
      filename: req.file.filename,
    });
  });
};

module.exports = { getGridFS, uploadFile };

