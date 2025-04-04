const mongoose = require("mongoose");

const teacherMarksSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  year: {
    type: String,
    required: true,
  },
  examType: {
    type: String,
    required: true,
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  marksObtained: {
    type: Number,
    required: true,
  },
  totalMarks: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["Pass", "Fail", "Absent"],
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("TeacherMarks", teacherMarksSchema);
