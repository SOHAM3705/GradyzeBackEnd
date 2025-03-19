const mongoose = require("mongoose");
const File = require("./filemodel");

const notificationSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
    },
    audience: {
      type: String,
      required: true,
      enum: ["all", "teachers", "students"], // Predefined audience types
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File", // Reference to the file stored in the File model
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;