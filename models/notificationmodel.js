const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  audience: { 
    type: String, 
    required: true, 
    enum: ["all", "teachers", "students"] 
  },
  fileId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "File"
  },
  adminId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Admin", 
    default: null // ✅ Optional if created by a teacher
  },
  teacherId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Teacher", 
    default: null // ✅ Only present if created by a teacher
  }
}, { timestamps: true });

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;

