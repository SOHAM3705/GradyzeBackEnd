const mongoose = require("mongoose");

// Subject Schema (for Subject Teachers)
const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Subject name
  year: { type: String, required: true }, // Year (e.g., First Year, Second Year)
  semester: { type: Number, required: true }, // Semester number (1, 2, etc.)
  division: { type: String, required: true } // Division (A, B, etc.)
});

// Assigned Class Schema (for Class Teachers)
const assignedClassSchema = new mongoose.Schema({
  year: { type: String, required: true }, // Class Year (e.g., First Year, Second Year)
  division: { type: String, required: true }, // Division (A, B, etc.)
  section: { type: String } // Optional section (if applicable)
});

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // Teacher's full name
  email: { type: String, required: true, unique: true, trim: true }, // Unique email
  password: { type: String, required: true }, // Hashed password
  department: { type: String, required: true, trim: true }, // Teacher's department

  teacherType: { 
    type: String, 
    enum: ["classTeacher", "subjectTeacher"], 
    required: true 
  }, // Defines the teacher type

  assignedClass: { 
    type: assignedClassSchema, 
    required: function() { return this.teacherType === "classTeacher"; } 
  }, // Required only for class teachers

  subjects: { 
    type: [subjectSchema], 
    required: function() { return this.teacherType === "subjectTeacher"; } 
  }, // Required only for subject teachers

  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true }, // Link to Admin
  
  createdAt: { type: Date, default: Date.now } // Auto-generated timestamp
});

// Explicitly set the collection name as "teachers"
module.exports = mongoose.model("Teacher", teacherSchema, "teachers");




