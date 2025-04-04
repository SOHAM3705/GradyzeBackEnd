const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  subjectName: {
    type: String,
    required: true,
  },
  marksObtained: {
    type: Number,
    min: 0,
  },
  totalMarks: {
    type: Number,
    min: 1,
  },
  status: {
    type: String,
    enum: ["Present", "Absent"],
    required: true,
  }
}, { _id: false });

const examSchema = new mongoose.Schema({
  examType: {
    type: String,
    enum: ["Unit Test", "Prelim", "Re-Unit", "Re-Prelim"],
    required: true,
  },
  subjects: [subjectSchema]
}, { _id: false });

const marksSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
    required: true,
  },
  academicYear: {
    type: String,
    required: true,
  },
  exams: [examSchema]
}, {
  timestamps: true
});

// Optional: Prevent duplicate entries per student per academic year
marksSchema.index({ studentId: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model("Marks", marksSchema);
