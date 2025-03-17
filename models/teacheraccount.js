const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true }, 
  year: { type: String, required: true }, 
  semester: { type: Number, required: true }, 
  division: { type: String, required: true }
});

const assignedClassSchema = new mongoose.Schema({
  year: { type: String, required: true }, 
  division: { type: String, required: true }, 
  section: { type: String }
});

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, 
  email: { type: String, required: true, unique: true, trim: true }, 
  password: { type: String, required: true }, 
  department: { type: String, required: true, trim: true }, 

  // ✅ Separate fields for each role
  isClassTeacher: { type: Boolean, default: false }, 
  isSubjectTeacher: { type: Boolean, default: false }, 

  // ✅ Assigned class (only if isClassTeacher is true)
  assignedClass: assignedClassSchema,

  // ✅ Subjects (only if isSubjectTeacher is true)
  subjects: [subjectSchema],

  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true }, 
  createdAt: { type: Date, default: Date.now } 
});

module.exports = mongoose.model("Teacher", teacherSchema, "teachers");





