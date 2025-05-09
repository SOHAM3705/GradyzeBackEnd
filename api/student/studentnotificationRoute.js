const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Notification = require("../../models/notificationmodel");
const Student = require("../../models/studentModel"); // Student collection
const { GridFSBucket } = require("mongodb");

// GET student details by ID
router.get("/:studentId", async (req, res) => {
  try {
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

router.get("/notifications", async (req, res) => {
  try {
    const { userRole, adminId, year, division } = req.query;

    // Validate adminId (required for all roles)
    if (!adminId) {
      return res.status(400).json({ error: "adminId is required" });
    }

    // Base query for admin-created notifications
    const adminNotifications = {
      adminId: new mongoose.Types.ObjectId(adminId),
      audience: { $in: ["all", userRole === "teacher" ? "teachers" : "students"] }
    };

    // For teacher-created notifications, match year/division
    const teacherNotifications = {
      teacherId: { $exists: true },
      "teacherData.adminId": new mongoose.Types.ObjectId(adminId),
      audience: { $in: ["all", userRole === "teacher" ? "teachers" : "students"] },
      ...(year && division && {
        $or: [
          { "teacherData.assignedClass.year": year },
          { "teacherData.assignedClass.division": division }
        ]
      })
    };

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
          $or: [adminNotifications, teacherNotifications]
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    res.json(notifications);
  } catch (err) {
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
