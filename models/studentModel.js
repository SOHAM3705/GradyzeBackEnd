const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const studentSchema = new mongoose.Schema({
  rollNo: { type: Number, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashed password
  year: { type: String, required: true },
  division: { type: String, required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Linking Admin
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true }, // Linking Teacher
  createdAt: { type: Date, default: Date.now },
});


module.exports = mongoose.model("Student", studentSchema, "students");