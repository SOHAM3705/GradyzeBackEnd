const mongoose = require('mongoose');

const syllabusSchema = new mongoose.Schema(
  {
    stream: { type: String, required: true },
    pattern: { type: String, required: true },
    year: { type: String, required: true },
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: "syllabusFiles" },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true }, // ✅ Add adminId
  },
  {
    timestamps: true, // ✅ Automatically adds createdAt and updatedAt
  }
);

const Syllabus = mongoose.model("Syllabus", syllabusSchema);
module.exports = Syllabus;
