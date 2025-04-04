const mongoose = require("mongoose");

const marksSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  examType: { type: String, required: true },
  year: { type: String, required: true },
  exams: [
    {
      subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true }, // moved here
      marksObtained: { type: Number, required: true },
      totalMarks: { type: Number, required: true },
      status: { type: String, enum: ['Pass', 'Fail', 'Absent'], required: true },
    }
  ]
});

module.exports = mongoose.model("TeacherMarks", marksSchema);
