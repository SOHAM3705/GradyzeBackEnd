const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const studentSchema = new mongoose.Schema({
  rollNo: { type: Number, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashed password
  year: { type: String, required: true },
  division: { type: String, required: true },
  semester: { type: Number, required: true, min: 1, max: 8 },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true }, // Linking Admin
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true }, // Linking Teacher
  createdAt: { type: Date, default: Date.now },
});

// ✅ Hash password before saving
studentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model("Student", studentSchema, "students");

