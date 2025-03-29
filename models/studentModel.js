const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  rollNo: { type: Number, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  
  password: { 
    type: String, 
    required: function () { return !this.googleId; } // Required only if no Google ID
  },  
  googleId: { type: String, default: null }, // Google ID, default is null

  year: { type: String, required: true },
  division: { type: String, required: true },
  
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Linking Admin
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true }, // Linking Teacher
  
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Student", studentSchema, "students");
