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
    ref: "File", // ✅ Correct reference 
  },
  adminId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Admin", 
    required: true, 
  },
}, { timestamps: true });

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
