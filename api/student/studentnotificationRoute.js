const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Notification = require("../../models/notificationmodel");
const { GridFSBucket } = require("mongodb");

router.get("/notifications", async (req, res) => {
    console.log("✅ Notifications API hit!");
    try {
      const { userRole, adminId, year, division } = req.query;
  
      if (!adminId) {
        return res.status(400).json({ error: "adminId is required" });
      }
  
      // Base query for admin-created notifications
      const adminNotificationsQuery = {
        adminId: new mongoose.Types.ObjectId(adminId),
        audience: { $in: ["all", userRole === "teacher" ? "teachers" : "students"] }
      };
  
      // Additional query for teacher-created notifications
      const teacherNotificationsQuery = {
        teacherId: { $exists: true },
        audience: { $in: ["all", userRole === "teacher" ? "teachers" : "students"] },
        $or: [
          { 'teacherData.year': year },
          { 'teacherData.division': division }
        ]
      };
  
      // Aggregate to join with teacher data
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
              adminNotificationsQuery,
              { 
                $and: [
                  { teacherId: { $exists: true } },
                  { "teacherData.adminId": new mongoose.Types.ObjectId(adminId) },
                  teacherNotificationsQuery
                ]
              }
            ]
          }
        },
        { $sort: { createdAt: -1 } },
        {
          $project: {
            _id: 1,
            message: 1,
            audience: 1,
            fileId: 1,
            createdAt: 1,
            adminId: 1,
            teacherId: 1,
            "teacherData.name": 1,
            "teacherData.year": 1,
            "teacherData.division": 1
          }
        }
      ]);
  
      res.json(notifications);
    } catch (err) {
      console.error("❌ Error fetching notifications:", err);
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
