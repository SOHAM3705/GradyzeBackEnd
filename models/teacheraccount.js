const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  year: { type: String, required: true },
  semester: { type: Number, required: true },
  division: { type: String, required: true },
});

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: { type: String, required: true },
  subjects: [subjectSchema], // Array of subjects the teacher teaches
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true }, // Link to Admin
  createdAt: { type: Date, default: Date.now },
});

// Explicitly set the collection name as "teachers"
module.exports = mongoose.model("Teacher", teacherSchema, "teachers");


