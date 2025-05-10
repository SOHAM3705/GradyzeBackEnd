const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Notification = require("../../models/notificationmodel");
const Student = require("../../models/studentModel"); // Student collection
const { GridFSBucket } = require("mongodb");

router.get("/notifications", async (req, res) => {
  try {
    const { userRole, adminId, year, division } = req.query;

    if (!adminId) {
      return res.status(400).json({ error: "adminId is required" });
    }

    const notifications = await Notification.aggregate([
      {
        $lookup: {
          from: "teachers",
          localField: "teacherId",
          foreignField: "_id",
          as: "teacherData"
        }
      },
      { $unwind: { path: "$teacherData", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            // Admin-created notifications (simplified condition)
            {
              adminId: new mongoose.Types.ObjectId(adminId),
              teacherId: { $in: [null, undefined] }, // More inclusive check
              audience: { $in: ["all", userRole === "teacher" ? "teachers" : "students"] }
            },
            // Teacher-created notifications
            {
              teacherId: { $exists: true, $ne: null },
              "teacherData.adminId": new mongoose.Types.ObjectId(adminId),
              audience: { $in: ["all", userRole === "teacher" ? "teachers" : "students"] },
              ...(year && division && {
                $or: [
                  { "teacherData.assignedClass.year": year },
                  { "teacherData.assignedClass.division": division }
                ]
              })
            }
          ]
        }
      },
      // Rest of your pipeline remains the same...
    ]);

    res.json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// GET student details by ID (now this won't catch "/notifications")
router.get("/:studentId", async (req, res) => {
  try {
    // Optional: Add validation for studentId
    if (!mongoose.Types.ObjectId.isValid(req.params.studentId)) {
      return res.status(400).json({ error: "Invalid student ID" });
    }

    const student = await Student.findById(req.params.studentId)
      .select("year division adminId") // Only return these fields
      .lean();

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(student);
  } catch (err) {
    console.error("Error fetching student:", err);
    res.status(500).json({ error: "Server error" });
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