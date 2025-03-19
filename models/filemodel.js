const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  fileID: { type: String, required: true },
  filePath: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const File = mongoose.model("File", fileSchema); // Make sure to register the model

module.exports = File