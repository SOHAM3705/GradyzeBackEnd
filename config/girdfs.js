const mongoose = require('mongoose');
const { GridFsStorage } = require('multer-gridfs-storage');
const multer = require('multer');
require('dotenv').config();

let gfs_syllabus, gfs_notifications;

// ✅ Initialize GridFS in Main Server File
const initGridFS = () => {
  mongoose.connection.once("open", () => {
    try {
      const db = mongoose.connection.db;
      if (!db) throw new Error("Database not found!");

      gfs_syllabus = new mongoose.mongo.GridFSBucket(db, { bucketName: 'syllabusFiles' });
      gfs_notifications = new mongoose.mongo.GridFSBucket(db, { bucketName: 'notificationFiles' });

      console.log("✅ GridFS initialized for syllabus and notifications!");
    } catch (err) {
      console.error("❌ GridFS Initialization Error:", err.message);
    }
  });
};

// ✅ Function to get GridFS instances
const getGridFS = (type) => {
  if (type === "syllabus") return gfs_syllabus;
  if (type === "notifications") return gfs_notifications;
  console.warn(`⚠️ Invalid GridFS type requested: ${type}`);
  return null;
};

// ✅ Dynamic Storage for Syllabus & Notifications
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  options: { useNewUrlParser: true }, // Removed deprecated 'useUnifiedTopology'
  file: async (req, file) => {
    const validTypes = ["syllabus", "notifications"];
    const type = req.body.type && validTypes.includes(req.body.type) ? req.body.type : "syllabus";

    return {
      filename: `${Date.now()}_${file.originalname}`,
      bucketName: type === "notifications" ? "notificationFiles" : "syllabusFiles",
      metadata: typeof req.body.metadata === "object" ? req.body.metadata : {},
    };
  },
});

// ✅ Multer Upload Config
const upload = multer({ storage });

// ✅ Unified File Upload Function
const uploadFile = (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(500).json({ message: "Error uploading file", error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    return res.status(200).json({
      message: "File uploaded successfully",
      filename: req.file.filename,
    });
  });
};

module.exports = { initGridFS, getGridFS, uploadFile };
