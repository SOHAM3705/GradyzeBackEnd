const mongoose = require("mongoose");

const marksSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Students', required: true },
  examType: { type: String, required: true },
  year: { type: String, required: true },
  exams: [
    {
      subjectName: { type: String, required: true },
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'teachers', required: true }, // moved here
      marksObtained: { type: Number, required: true },
      totalMarks: { type: Number, required: true },
      status: { type: String, enum: ['Pass', 'Fail', 'Absent'], required: true },
    }
  ]
});

module.exports = mongoose.model("TeacherMarks", marksSchema);
