const mongoose = require("mongoose");

const syllabusSchema = new mongoose.Schema({
  stream: { type: String, required: true },
  pattern: { type: String, required: true },
  year: { type: String, required: true },
  fileId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "File", // ✅ Changed from "syllabusFiles" to "File"
  },
  adminId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Admin", 
    required: true 
  },
}, { timestamps: true });

const Syllabus = mongoose.model("Syllabus", syllabusSchema);
module.exports = Syllabus;
