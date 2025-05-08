const mongoose = require("mongoose");

const marksSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  examType: { type: String, required: true, enum: ['unit-test', 're-unit-test', 'prelim', 're-prelim'] },
  year: { type: String, required: true },
  exams: [
    {
      subjectName: { type: String, required: true },
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
      marksObtained: {
        q1q2: { type: Number, default: 0 },
        q3q4: { type: Number, default: 0 },
        q5q6: { type: Number, default: 0 },
        q7q8: { type: Number, default: 0 },
        total: { type: Number, required: true }
      },
      totalMarks: { type: Number, required: true },
      status: {
        type: String,
        enum: ['Pass', 'Fail', 'Absent'],
        required: true
      },
      dateAdded: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("TeacherMarks", marksSchema);