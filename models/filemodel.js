const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  fileID: { type: String, required: true, unique: true }, // ✅ Ensure uniqueness
  filePath: { type: String, required: true },
}, { timestamps: true }); // ✅ Adds createdAt and updatedAt automatically

const File = mongoose.model("File", fileSchema);
module.exports = File;
