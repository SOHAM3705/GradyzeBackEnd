const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
    },
    audience: {
      type: String,
      required: true,
      enum: ["all", "teachers", "students"],
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId, // ✅ Store the admin ID
      ref: "Admin", // Make sure you have an Admin model
      required: true,
    }
  },
  {
    timestamps: true, // ✅ Adds createdAt and updatedAt
  }
);

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
