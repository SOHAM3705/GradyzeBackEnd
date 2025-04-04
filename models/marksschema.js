const marksSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  examType: { type: String, required: true },
  year: { type: String, required: true },
  exams: [
    {
      subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
      marksObtained: { type: Number, required: true },
      totalMarks: { type: Number, required: true },
      status: { type: String, enum: ['Pass', 'Fail', 'Absent'], required: true },
    }
  ]
});

module.exports = mongoose.model("TeacherMarks", teacherMarksSchema);
