const mongoose = require("mongoose");
const File = require("./filemodel");
const syllabusSchema = new mongoose.Schema(
  {
    stream: {
      type: String,
      required: true,
      enum: [
        "computer",
        "it",
        "mechanical",
        "electrical",
        "civil"
      ], // Predefined options for stream
    },
    pattern: {
      type: String,
      required: true,
      enum: ["2024", "2019"], // Predefined pattern options
    },
    year: {
      type: String,
      required: true,
      enum: ["FE", "SE", "TE", "BE"], // Predefined year options
    },
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "File", // Reference to the file stored in the File model
      },
    },
    {
      timestamps: true,
    }
  );

const Syllabus = mongoose.model("Syllabus", syllabusSchema);

module.exports = Syllabus;