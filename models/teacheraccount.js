const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Subject name
  year: { type: String, required: true }, // Year (e.g., First Year, Second Year)
  semester: { type: Number, required: true }, // Semester number (1, 2, etc.)
  division: { type: String, required: true }, // Division (A, B, etc.)
});

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Teacher's full name
  email: { type: String, required: true, unique: true }, // Unique email
  password: { type: String, required: true }, // Hashed password
  department: { type: String, required: true }, // Teacher's department
  teacherType: { 
    type: String, 
    enum: ["classTeacher", "subjectTeacher"], 
    required: true 
  }, // Defines the teacher type
  division: { type: String, required: function() { return this.teacherType === "classTeacher"; } }, // Only required if classTeacher
  subjects: { 
    type: [subjectSchema], 
    required: function() { return this.teacherType === "subjectTeacher"; } 
  }, // Only required if subjectTeacher
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true }, // Link to Admin
  createdAt: { type: Date, default: Date.now }, // Auto-generated timestamp
});

// Explicitly set the collection name as "teachers"
module.exports = mongoose.model("Teacher", teacherSchema, "teachers");



